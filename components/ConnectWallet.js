import React, {useState, useReducer} from 'react'
import { walletReducer, initialState} from "../store/walletReducer"

export default function ConnectWallet() {
  const [state, dispatch] = useReducer(walletReducer, initialState);
  const ConnectWallet = async () => {
    if (typeof window.unisat == 'undefined') {
      alert("Please install unisat wallet");
    }
    else {
      try {
        let accounts = await window.unisat.requestAccounts();
        dispatch({type: "SET_ADDRESS", data: accounts});
        setWalletAddress(accounts.toString());
        console.log('connect success', accounts);
      } catch (e) {
        console.log('connect failed');
      }
    }
  }
  return (
    <div className="d-flex gap-3 align-content-center align-items-center">
      <button type="button" className="btn btn-primary" onClick={() => {ConnectWallet()}}>Connect Wallet</button>
      {
        state.walletAddress != "" ? <div>{state.walletAddress}</div> : <></>
      }
    </div>
  )
}
