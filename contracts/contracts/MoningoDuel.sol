// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MoningoDuel - 1v1 English quiz duels with a MON pot.
/// @notice Both players stake STAKE into the same match; the backend referee reports the winner,
///         who receives the pot minus FEE_BPS. Draws refund both. If the referee never settles,
///         anyone can refund after the timeouts, so funds can never get stuck.
contract MoningoDuel is Ownable {
    uint256 public constant STAKE = 0.5 ether;
    uint256 public constant FEE_BPS = 100; // 1% of the 1 MON pot -> winner gets 0.99 MON
    uint256 public constant JOIN_TIMEOUT = 10 minutes;
    uint256 public constant SETTLE_TIMEOUT = 1 hours;

    struct Match {
        address p1;
        address p2;
        uint64 createdAt;
        bool closed;
    }

    address public referee;
    uint256 public feesAccrued;
    mapping(bytes32 => Match) public matches;

    event Joined(bytes32 indexed matchId, address indexed player);
    event Settled(bytes32 indexed matchId, address indexed winner, uint256 payout);
    event Refunded(bytes32 indexed matchId);
    event RefereeUpdated(address referee);

    error WrongStake();
    error NotYourMatch();
    error AlreadyJoined();
    error MatchClosed();
    error NotReady();
    error BadWinner();
    error NotReferee();
    error TooEarly();
    error TransferFailed();

    constructor(address _referee) Ownable(msg.sender) {
        referee = _referee;
        emit RefereeUpdated(_referee);
    }

    /// @notice Match id is bound to both players, so nobody else can take a seat.
    function matchIdOf(address a, address b, bytes32 nonce) public pure returns (bytes32) {
        (address lo, address hi) = a < b ? (a, b) : (b, a);
        return keccak256(abi.encodePacked(lo, hi, nonce));
    }

    function join(bytes32 nonce, address opponent) external payable returns (bytes32 id) {
        if (msg.value != STAKE) revert WrongStake();
        if (opponent == msg.sender || opponent == address(0)) revert NotYourMatch();
        id = matchIdOf(msg.sender, opponent, nonce);
        Match storage m = matches[id];
        if (m.closed) revert MatchClosed();
        if (m.p1 == address(0)) {
            m.p1 = msg.sender;
            m.createdAt = uint64(block.timestamp);
        } else if (m.p1 == msg.sender || m.p2 != address(0)) {
            revert AlreadyJoined();
        } else {
            m.p2 = msg.sender;
        }
        emit Joined(id, msg.sender);
    }

    /// @param winner address(0) = draw (both refunded, no fee).
    function settle(bytes32 id, address winner) external {
        if (msg.sender != referee) revert NotReferee();
        Match storage m = matches[id];
        if (m.closed) revert MatchClosed();
        if (m.p2 == address(0)) revert NotReady();
        m.closed = true;
        if (winner == address(0)) {
            _pay(m.p1, STAKE);
            _pay(m.p2, STAKE);
            emit Refunded(id);
            return;
        }
        if (winner != m.p1 && winner != m.p2) revert BadWinner();
        uint256 pot = STAKE * 2;
        uint256 fee = (pot * FEE_BPS) / 10_000;
        feesAccrued += fee;
        _pay(winner, pot - fee);
        emit Settled(id, winner, pot - fee);
    }

    /// @notice Refund an unfinished match. Referee may cancel a half-joined match any time;
    ///         anyone may after JOIN_TIMEOUT (half-joined) or SETTLE_TIMEOUT (unsettled).
    function cancel(bytes32 id) external {
        Match storage m = matches[id];
        if (m.closed || m.p1 == address(0)) revert MatchClosed();
        bool full = m.p2 != address(0);
        uint256 wait = full ? SETTLE_TIMEOUT : JOIN_TIMEOUT;
        if (msg.sender != referee || full) {
            if (block.timestamp <= m.createdAt + wait) revert TooEarly();
        }
        m.closed = true;
        _pay(m.p1, STAKE);
        if (full) _pay(m.p2, STAKE);
        emit Refunded(id);
    }

    function setReferee(address _referee) external onlyOwner {
        referee = _referee;
        emit RefereeUpdated(_referee);
    }

    function withdrawFees(address to) external onlyOwner {
        uint256 amount = feesAccrued;
        feesAccrued = 0;
        _pay(to, amount);
    }

    function _pay(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
