# Monad Akıllı Kontrat Örnekleri

## ERC-20 Token Kontratı
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("MyToken", "MTK") {
        _mint(msg.sender, initialSupply);
    }
}
```

## NFT Kontratı (ERC-721)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MyNFT is ERC721 {
    constructor() ERC721("MyNFT", "MNFT") {}
    
    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
}
```

## Monad'da 256KB Kontrat Örneği
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LargeContract {
    uint256[10000] public largeArray; // Monad'da 256KB'a kadar desteklenir
    
    function set(uint256 index, uint256 value) public {
        largeArray[index] = value;
    }
}
```

---

### Kaynaklar
- [Monad Docs - Akıllı Kontratlar](https://docs.monad.xyz)
- [OpenZeppelin Kontratları](https://docs.openzeppelin.com)