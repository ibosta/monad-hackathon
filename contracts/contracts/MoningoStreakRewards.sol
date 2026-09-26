// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

interface IMoningoStreaks {
    function userStreaks(address user) external view returns (uint256);
}

/// @title MoningoStreakRewards - the streak tree: growing one-time bonuses at streak milestones.
/// @notice Trustless: eligibility is read straight from Moningo.userStreaks, no backend signature.
///         Each milestone can be claimed once per wallet, forever.
contract MoningoStreakRewards is Ownable {
    IMoningoStreaks public immutable moningo;
    uint256[] private _days;
    uint256[] private _rewards;
    mapping(address => mapping(uint256 => bool)) public claimed;

    event MilestoneClaimed(address indexed user, uint256 indexed day, uint256 reward);

    error NotAMilestone();
    error StreakTooShort();
    error AlreadyClaimed();
    error PoolEmpty();
    error TransferFailed();

    constructor(address moningo_) Ownable(msg.sender) {
        moningo = IMoningoStreaks(moningo_);
        _days = [1, 3, 5, 7, 10, 14, 21, 30, 50, 100];
        _rewards = [
            0.005 ether,
            0.01 ether,
            0.015 ether,
            0.03 ether,
            0.04 ether,
            0.07 ether,
            0.1 ether,
            0.2 ether,
            0.3 ether,
            0.6 ether
        ];
    }

    receive() external payable {}

    function milestones() external view returns (uint256[] memory days_, uint256[] memory rewards_) {
        return (_days, _rewards);
    }

    function rewardFor(uint256 day) public view returns (uint256) {
        for (uint256 i; i < _days.length; i++) if (_days[i] == day) return _rewards[i];
        revert NotAMilestone();
    }

    function claim(uint256 day) external {
        uint256 reward = rewardFor(day);
        if (moningo.userStreaks(msg.sender) < day) revert StreakTooShort();
        if (claimed[msg.sender][day]) revert AlreadyClaimed();
        if (address(this).balance < reward) revert PoolEmpty();
        claimed[msg.sender][day] = true;
        (bool ok, ) = msg.sender.call{ value: reward }("");
        if (!ok) revert TransferFailed();
        emit MilestoneClaimed(msg.sender, day, reward);
    }

    function withdraw(uint256 amount) external onlyOwner {
        (bool ok, ) = owner().call{ value: amount }("");
        if (!ok) revert TransferFailed();
    }
}
