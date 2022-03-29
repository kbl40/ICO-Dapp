import { BigNumber, Contract, providers, utils } from "ethers";
import Head from 'next/head';
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { NFT_CONTRACT_ADDRESS, TOKEN_CONTRACT_ADDRESS } from "../constants";
import nftABI from "../constants/nftABI.json";
import tokenABI from "../constants/tokenABI.json";
import styles from '../styles/Home.module.css'

// Home function
export default function Home() {
  // Create a BigNumber `0`
  const zero = BigNumber.from(0);

  // walletConnected keeps track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);

  // loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);

  // tokensToBeClaimed keeps track of the number of tokens that can be claimed
  // based on the Crypto Dev NFT's held by the user for which they haven't claimed the tokens
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);

  // balanceOfCryptoDevTokens keeps track of the number of Crypto Dev tokens owned by an address
  const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] = useState(zero);

  // Amount of the tokens that the user wants to mint
  const [tokenAmount, setTokenAmount] = useState(zero);

  // tokensMinted is the total number of tokens that have been minted till now out of 10,000
  const [tokensMinted, setTokensMinted] = useState(zero);
  
  // Create a reference to the Web3Modal (used for connecting to MetaMask) which persists as long as the page is open
  const web3ModalRef = useRef();

  /**
   * getTokensToBeClaimed: checks the balance of tokens that can be claimed by the user
   */
  const getTokensToBeClaimed = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // No need for the Signer here, as we are only reading state
      const provider = await getProviderOrSigner();

      // Create an instance of the NFT Contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, nftABI.abi, provider);

      // Create an instance of the Token Contract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, tokenABI.abi, provider);

      // We get the Signer now to extract the address of the currently connected MetaMask account
      const signer = await getProviderOrSigner(true);

      // Get the address associated to teh signer which is connected to MetaMask
      const address = await signer.getAddress();

      // Call the balanceOf from the NFT contract to get the number of NFT's held by the user
      const balance = await nftContract.balanceOf(address);

      // balance is a Big Number and thus we would compare it with Big Number `zero`
      if (balance === zero) {
        setTokensToBeClaimed(zero)
      } else {
        // ammount keeps track of the number of unclaimed tokens
        var amount = 0;

        // For all the NFT's, check if the tokens have already been claimed
        // Only increase the amount if the tokens have not be claimed for an NFT (for a given tokenId)
        for (var i = 0; i < balance; i++) {
          const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
          const claimed = await tokenContract.tokenIdsClaimed(tokenId);
          if (!claimed) {
            amount++;
          }
        }

        // tokensToBeClaimed has been initialized to a Big Number, thus we would convert amount 
        // to a Big Number and then set its value
        setTokensToBeClaimed(BigNumber.from(amount));
      }
    } catch (err) {
      console.error(err);
      setTokensToBeClaimed(zero);
    }
  };

  /**
   * getBalanceOfCryptoDevTokens: checks the balance of Crypto Dev Tokens helf by an address
   */
  const getBalanceOfCryptoDevTokens = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // No need for Signer as we are only reading state
      const provider = await getProviderOrSigner();

      // Create an instance of token contract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, tokenABI.abi, provider);

      // We get the signer now to extract the address of the currently connected MetaMask account
      const signer = await getProviderOrSigner(true);

      // Get the address associated to the signer which is connected to MetaMask
      const address = await signer.getAddress();

      // Call the balanceOf from the token contract to get the number of tokens held by the user
      const balance = await tokenContract.balanceOf(address);

      // balance is already a Big Number so we don't have to convert it before setting it
      setBalanceOfCryptoDevTokens(balance);
    } catch (err) {
      console.error(err);
      setBalanceOfCryptoDevTokens(zero);
    }
  };

  /** 
   * mintCryptoDevToken: mints `amount` number of tokens to a given address
   */
  const mintCryptoDevToken = async (amount) => {
    try {  
      // We need a Signer here since it is a write transaction
      const signer = await getProviderOrSigner(true);

      // Create an instance of tokenContract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, tokenABI.abi, signer);

      // Each token is `0.001` ether. The value we need to send is `0.001 * amount`
      const value = 0.001 * amount;
      const tx = await tokenContract.mint(amount, {
        // value signifies the cost of one crypto dev token which is "0.001" ETH.
        // We are parsing 0.001 string to ether using the utils library from ethers.js
        value: utils.parseEther(value.toString()),
      });
      setLoading(true);
      await tx.wait();
      setLoading(false);

      window.alert("Successfully minted Crypto Dev Tokens");

      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };

  // claimCryptoDevTokens: Helps the user claim Crypto Dev Tokens
  const claimCryptoDevTokens = async () => {
    try {
      // Need a signer since this is a write transaction
      const signer = await getProviderOrSigner(true);

      // Create an instance of tokenContract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, tokenABI.abi, signer);

      const tx = await tokenContract.claim();
      setLoading(true)

      await tx.wait();

      setLoading(false);
      window.alert("Successfully claimed Cryto Dev Tokens");

      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };

  /** 
   * getTotalTokensMinted: Retrieves how many tokens have been minted till now 
   */
  const getTotalTokensMinted = async () => {
    try {
      // Get the provider
      const provider = await getProviderOrSigner();

      // Create an instance of token contract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, tokenABI.abi, provider);

      // Get all the tokens that have been minted
      const _tokensMinted = await tokenContract.totalSupply();
      setTokensMinted(_tokensMinted);
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Returns a Provider or Signer object representing the Ethereum RPC with or without the 
   * signing capabilities of MetaMask attached
   * 
   * A `Provider` is needed to interact with the blockchain - reading transactions, reading balances, reading state, etc.
   * 
   * A `Signer` is a type of Provider used in case a `write` transaction needs to be made to the blockchain, which involves the connected account
   * needing to make a digital signature to authorize the transaction being made. MetaMask exposes a Signer API to allow your website to
   * request signatures from the user using Signer functions.
   * 
   * @param{*} needSigner - True if you need the signer, default false otherwise
   */
  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to MetaMask
    // Since we store `web3Modal` as a reference, we need to access the current value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Change the network to Rinkeby")
      throw new Error("Change network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  /**
   * connectWallet: Connects the MetaMask wallet
   */
  const connectWallet = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // When used for the first time, it prompts the user to connect their wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  // useEffects are used to react to changes in state of the website
  // The array at the end of the function call represents what state changes will trigger this effect
  // In this case, whenever the value of `walletConnected` changes this effect will be called
  useEffect(() => {
    if (!walletConnected) {
      // Assign the Web3Modal class to the the reference object by setting its current value 
      // The current value is persisted throughout as long as this page is open
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getTotalTokensMinted();
      getBalanceOfCryptoDevTokens();
      getTokensToBeClaimed();
    }
  }, [walletConnected]);

  /**
   * renderButton: Returns a button based on the state of the dapp
   */
  const renderButton = () => {
    // If we are currently waiting for something, return a loading button
    if (loading) {
      return (
        <div>
          <button className={styles.button}>Loading...</button>
        </div>
      );
    }

    // If tokens to be claimed are greater than 0, return a claim button
    if (tokensToBeClaimed > 0) {
      return (
        <div>
          <div className={styles.description}>
            {tokensToBeClaimed * 10} Tokens can be claimed!
          </div>
          <button className={styles.button} onClick={claimCryptoDevTokens}>
            Claim Tokens
          </button>
        </div>
      );
    }

    // If user doesn't have any tokens to claim, show the mint button
    return (
      <div style={{ display: "flex-col" }}>
        <div>
          <input
            type="number"
            placeholder="Amount of Tokens" 
            // BigNumber.from conversts the `e.target.value` to a BigNumber
            onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))} 
            className={styles.input}
          />
        </div>

        <button className={styles.button} disabled={!(tokenAmount > 0)} onClick={() => mintCryptoDevToken(tokenAmount)}>
          Mint Tokens
        </button>
      </div>
    );
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="ICO-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.main}> 
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs ICO!</h1>
          <div className={styles.description}>
            You can claim or mint Crypto Dev tokens here
          </div>
          {walletConnected ? (
            <div>
              <div className={styles.description}>
                You have minted  {utils.formatEther(balanceOfCryptoDevTokens)} Crypto Dev Tokens
              </div>
              <div className={styles.description}>
                Overall {utils.formatEther(tokensMinted)} / 100000 have been minted!!
              </div>
              {renderButton()}
            </div>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>
    </div>
  );
}
