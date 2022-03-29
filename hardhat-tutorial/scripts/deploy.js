const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env" });
const { CRYPTO_DEVS_NFT_CONTRACT_ADDRESS } = require("../constants");

async function main() {
    // Address of the Crypto Devs NFT contract previously deployed
    const cryptoDevsNFTContract = CRYPTO_DEVS_NFT_CONTRACT_ADDRESS;

    /**
     * A ContractFactory in ethers.js is an abstraction used to deploy new smart contracts,
     * so cryptoDevsTokenContract here is a factory for instances of our CryptoDevToken contract.
     */
    const cryptoDevsTokenContract = await ethers.getContractFactory("CryptoDevToken");

    // Deploy the contract
    const deployedCryptoDevsTokenContract = await cryptoDevsTokenContract.deploy(cryptoDevsNFTContract);

    // Print the address of the deployed contract
    console.log("Crypto Devs Token Contract Address:", deployedCryptoDevsTokenContract.address);
}

main() 
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });