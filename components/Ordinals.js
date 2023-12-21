import React, { useEffect, useState } from 'react';
import { addDocument } from '@/utils/addData';
import { useSelector } from 'react-redux';
import { getAllDoument } from '@/utils/getAllData';
import toastr from 'toastr';
import { tryEach } from '@/public/js/connectjs-lib';


export default function Ordinals() {

  let dummyUtxoValue = 1_000;
  let numberOfDummyUtxosToCreate = 1;

  let isProduction = false;
  let network;
  let txHexByIdCache = {};
  // const baseMempoolUrl = isProduction ? "https://mempool.space" : "https://mempool.space/signet"
  const ordinalsExplorerUrl = isProduction ? "https://ordinals.com" : "https://explorer-signet.openordex.org"
  const baseMempoolUrl = isProduction ? "https://mempool.space" : "https://mempool.space/testnet"
  const networkName = isProduction ? "mainnet" : "signet"
  const baseMempoolApiUrl = `${baseMempoolUrl}/api`

  const bitcoinPriceApiUrl = "https://blockchain.info/ticker?cors=true";
  let bitcoinPrice = fetch(bitcoinPriceApiUrl)
    .then(response => response.json())
    .then(data => data.USD.last)

  let recommendedFeeRate;
  let paymentUtxos = [];
  let inscription;
  let sellerSignedPsbt;


  const wallet = useSelector(state => state.wallet);


  const [ordinals, setOrdinals] = useState([]);

  const [number, setNumber] = useState(0);
  const [id, setId] = useState("");
  const [owner, setOwner] = useState("");
  const [psbt, setPsbt] = useState("");
  const [utxo, setUtxo] = useState("");
  const [price, setPrice] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Init bitcoin library
  //--------------------------------------------------
  useEffect(() => {
    modulesInitializedPromise
  }, []);

  const modulesInitializedPromise = new Promise(resolve => {
    // const interval = setInterval(() => {
    if (window.bitcoin && window.secp256k1 && window.connect) {
      network = isProduction ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
      console.log("Bitcoin initializing...");
      bitcoin.initEccLib(secp256k1)
      console.log("Bitcoin initialized.");
      // clearInterval(interval);
      resolve()
    }
    // }, 50)
  })
  //---------------------------------------------------

  useEffect(() => {
    // addData();
    loadData();
  }, []);

  const handleDetailView = async item => {
    setNumber(item.inscriptionNumber);
    setId(item.id);
    setOwner(item.owner);
    setPsbt(item.psbt);
    setUtxo(item.utxo);
    setPrice(item.price);
    // try {
    //   inscription = await getInscriptionDataById(id);
    // } catch (error) {
    //   console.log(error);
    // }


    // sellerSignedPsbt = await getLowestPriceSellPSBGForUtxo(item.utxo)

    setVisible(true);
    // setUtx0Value(item.outputValue / Math.pow(10, 8) + "BTC" + `($${(utx0Value * await bitcoinPrice).toFixed(2)})`);
  }

  const loadData = async () => {
    setLoading(true);
    const { result, error } = await getAllDoument("ordinals");
    if (!error) setOrdinals(result);
    setLoading(false);
  }

  const handleBuy = async () => {
    if (wallet.walletAddress === "") return toastr.warning("Connect your wallet.");

    recommendedFeeRate = fetch(`${baseMempoolApiUrl}/v1/fees/recommended`)
      .then(response => response.json())
      .then(data => data[feeLevel]);

    // recommendedFeeRate = 10;

    let payerUtxos = await getAddressUtxos(wallet.walletAddress);
    const potentialDummyUtxos = payerUtxos.filter(utxo => utxo.value <= dummyUtxoValue)
    let dummyUtxo = undefined
    try {
      for (const potentialDummyUtxo of potentialDummyUtxos) {
        // if (!(await doesUtxoContainInscription(potentialDummyUtxo))) {
        dummyUtxo = potentialDummyUtxo;
        // break;
        // }
      }
    } catch (error) {
      console.log(error);
    }

    let minimumValueRequired;
    let vins;
    let vouts;

    if (!dummyUtxo) {
      minimumValueRequired = (numberOfDummyUtxosToCreate * dummyUtxoValue);
      vins = 0;
      vouts = numberOfDummyUtxosToCreate;
    } else {
      minimumValueRequired = price + (numberOfDummyUtxosToCreate * dummyUtxoValue)
      vins = 1;
      vouts = 2 + numberOfDummyUtxosToCreate
    }

    try {
      // paymentUtxos = await selectUtxos(payerUtxos, minimumValueRequired, vins, vouts, await recommendedFeeRate)
    } catch (e) {
      // paymentUtxos = undefined
      paymentUtxos = []
      console.error(e)

      return alert(e)
    }
    let psbtDummyUtxos;
    try {
      psbtDummyUtxos = await generatePSBTGeneratingDummyUtxos(wallet.walletAddress, numberOfDummyUtxosToCreate, paymentUtxos);
    } catch (error) {
      console.log(error);
    }
    let psbtByingInscription;
    try {
      psbtByingInscription = await generatePSBTBuyingInscription(wallet.walletAddress, wallet.walletAddress, price, payerUtxos, dummyUtxo);
    } catch (error) {
      console.log(error);
    }
    console.log(psbtDummyUtxos, psbtByingInscription);

    displayBuyPsbt(wallet.walletAddress, "Successfully bought.");
    // console.log(psbt);
  }

  const generatePSBTBuyingInscription = async (payerAddress, receiverAddress, price, paymentUtxos, dummyUtxo) => {
    let network = bitcoin.networks.testnet;
    const psbt = new bitcoin.Psbt({ network });
    let totalValue = 0
    let totalPaymentValue = 0

    // Add dummy utxo input
    const tx = bitcoin.Transaction.fromHex(await getTxHexById(dummyUtxo.txid))
    for (const output in tx.outs) {
      try { tx.setWitness(parseInt(output), []) } catch { }
    }

    psbt.addInput({
      hash: dummyUtxo.txid,
      index: dummyUtxo.vout,
      nonWitnessUtxo: tx.toBuffer(),
      // witnessUtxo: tx.outs[dummyUtxo.vout],
    });

    // Add inscription output
    psbt.addOutput({
      address: receiverAddress,
      value: dummyUtxo.value + 0,
      // value: dummyUtxo.value + Number(inscription['output value']),
    });

    // Add payer signed input
    // psbt.addInput({
    //   ...sellerSignedPsbt.data.globalMap.unsignedTx.tx.ins[0],
    //   ...sellerSignedPsbt.data.inputs[0]
    // })
    // Add payer output
    // psbt.addOutput({
      // ...sellerSignedPsbt.data.globalMap.unsignedTx.tx.outs[0],
    // })

    console.log(paymentUtxos);

    // Add payment utxo inputs
    for (const utxo of paymentUtxos) {
      const tx = bitcoin.Transaction.fromHex(await getTxHexById(utxo.txid))
      for (const output in tx.outs) {
        try { tx.setWitness(parseInt(output), []) } catch { }
      }

      // psbt.addInput({
      //   hash: utxo.txid,
      //   index: utxo.vout,
      //   nonWitnessUtxo: tx.toBuffer(),
      //   // witnessUtxo: tx.outs[utxo.vout],
      // });


      totalValue += utxo.value
      totalPaymentValue += utxo.value
    }


    // Create a new dummy utxo output for the next purchase
    psbt.addOutput({
      address: payerAddress,
      value: dummyUtxoValue,
    })

    const fee = calculateFee(psbt.txInputs.length, psbt.txOutputs.length, await recommendedFeeRate)

    const changeValue = totalValue - dummyUtxo.value - price - fee

    console.log("change", changeValue);

    if (changeValue < 0) {
      throw `Your wallet address doesn't have enough funds to buy this inscription.
Price:          ${satToBtc(price)} BTC
Fees:       ${satToBtc(fee + dummyUtxoValue)} BTC
You have:   ${satToBtc(totalPaymentValue)} BTC
Required:   ${satToBtc(totalValue - changeValue)} BTC
Missing:     ${satToBtc(-changeValue)} BTC`
    }

    // Change utxo
    psbt.addOutput({
      address: payerAddress,
      value: changeValue,
    });

    return psbt.toBase64();
  }

  const generatePSBTGeneratingDummyUtxos = async (payerAddress, numberOfDummyUtxosToCreate, payerUtxos) => {
    const psbt = new bitcoin.Psbt({ network });
    let totalValue = 0;

    for (const utxo of payerUtxos) {
      const tx = bitcoin.Transaction.fromHex(await getTxHexById(utxo.txid))
      for (const output in tx.outs) {
        try { tx.setWitness(parseInt(output), []) } catch { }
      }

      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: tx.toBuffer(),
        // witnessUtxo: tx.outs[utxo.vout],
      });

      totalValue += utxo.value
    }

    for (let i = 0; i < numberOfDummyUtxosToCreate; i++) {
      psbt.addOutput({
        address: payerAddress,
        value: dummyUtxoValue,
      });
    }

    const fee = calculateFee(psbt.txInputs.length, psbt.txOutputs.length, await recommendedFeeRate);
    console.log(totalValue, totalValue - (numberOfDummyUtxosToCreate * dummyUtxoValue) - fee);
    
    // Change utxo
    psbt.addOutput({
      address: payerAddress,
      value: 50,
      // value: totalValue - (numberOfDummyUtxosToCreate * dummyUtxoValue) - fee,
    });

    return psbt.toBase64();
  }


  async function getAddressUtxos(address) {
    return await fetch(`${baseMempoolApiUrl}/address/${address}/utxo`)
      .then(response => response.json())
  }

  async function selectUtxos(utxos, amount, vins, vouts, recommendedFeeRate) {
    const selectedUtxos = [];
    let selectedAmount = 0;

    // Sort descending by value, and filter out dummy utxos
    utxos = utxos.filter(x => x.value > dummyUtxoValue).sort((a, b) => b.value - a.value)

    for (const utxo of utxos) {
      // Never spend a utxo that contains an inscription for cardinal purposes
      if (await doesUtxoContainInscription(utxo)) {
        continue
      }
      selectedUtxos.push(utxo)
      selectedAmount += utxo.value

      if (selectedAmount >= amount + dummyUtxoValue + calculateFee(vins + selectedUtxos.length, vouts, recommendedFeeRate)) {
        break
      }
    }

    if (selectedAmount < amount) {
      throw new Error(`Not enough cardinal spendable funds.
          Address has:  ${satToBtc(selectedAmount)} BTC
          Needed:          ${satToBtc(amount)} BTC
          
          UTXOs:
          ${utxos.map(x => `${x.txid}:${x.vout}`).join("\n")}`)
    }

    return selectedUtxos
  }

  function validateSellerPSBTAndExtractPrice(sellerSignedPsbtBase64, utxo) {
    try {
      sellerSignedPsbt = bitcoin.Psbt.fromBase64(sellerSignedPsbtBase64, { network })
      const sellerInput = sellerSignedPsbt.txInputs[0]
      const sellerSignedPsbtInput = `${sellerInput.hash.reverse().toString('hex')}:${sellerInput.index}`

      if (sellerSignedPsbtInput != utxo) {
        throw `Seller signed PSBT does not match this inscription\n\n${sellerSignedPsbtInput}\n!=\n${utxo}`
      }

      if (sellerSignedPsbt.txInputs.length != 1 || sellerSignedPsbt.txInputs.length != 1) {
        throw `Invalid seller signed PSBT`
      }

      try {
        sellerSignedPsbt.extractTransaction(true)
      } catch (e) {
        if (e.message == 'Not finalized') {
          throw 'PSBT not signed'
        } else if (e.message != 'Outputs are spending more than Inputs') {
          throw 'Invalid PSBT ' + e.message || e
        }
      }

      const sellerOutput = sellerSignedPsbt.txOutputs[0]
      let price = sellerOutput.value

      return Number(price)
    } catch (e) {
      console.error(e)
    }
  }

  async function doesUtxoContainInscription(utxo) {
    const html = await fetch(`${ordinalsExplorerUrl}/output/${utxo.txid}:${utxo.vout}`)
      .then(response => response.text())

    return html.match(/class=thumbnails/) !== null
  }

  function calculateFee(vins, vouts, recommendedFeeRate, includeChangeOutput = true) {
    const baseTxSize = 10;
    const inSize = 180;
    const outSize = 34;

    const txSize = baseTxSize + (vins * inSize) + (vouts * outSize) + (includeChangeOutput * outSize);
    const fee = txSize * recommendedFeeRate;

    return fee;
  }

  async function getTxHexById(txId) {
    if (!txHexByIdCache[txId]) {
      txHexByIdCache[txId] = await fetch(`${baseMempoolApiUrl}/tx/${txId}/hex`)
        .then(response => response.text())
    }

    return txHexByIdCache[txId]
  }

  async function getInscriptionDataById(inscriptionId, verifyIsInscriptionNumber) {
    const html = await fetch(ordinalsExplorerUrl + "/inscription/" + inscriptionId)
      .then(response => response.text())

    const data = [...html.matchAll(/<dt>(.*?)<\/dt>\s*<dd.*?>(.*?)<\/dd>/gm)]
      .map(x => { x[2] = x[2].replace(/<.*?>/gm, ''); return x })
      .reduce((a, b) => { return { ...a, [b[1]]: b[2] } }, {});

    const error = `Inscription ${verifyIsInscriptionNumber || inscriptionId} not found (maybe you're on signet and looking for a mainnet inscription or vice versa)`
    try {
      data.number = html.match(/<h1>Inscription (\d*)<\/h1>/)[1]
    } catch { throw new Error(error) }
    if (verifyIsInscriptionNumber && String(data.number) != String(verifyIsInscriptionNumber)) {
      throw new Error(error)
    }

    return data
  }

  async function getLowestPriceSellPSBGForUtxo(utxo) {
    await nostrRelay.connect()
    const orders = (await nostrRelay.list([{
      kinds: [nostrOrderEventKind],
      "#u": [utxo]
    }])).filter(a => a.tags.find(x => x?.[0] == 's')?.[1])
      .sort((a, b) => Number(a.tags.find(x => x?.[0] == 's')[1]) - Number(b.tags.find(x => x?.[0] == 's')[1]))

    for (const order of orders) {
      const price = validateSellerPSBTAndExtractPrice(order.content, utxo)
      if (price == Number(order.tags.find(x => x?.[0] == 's')[1])) {
        return order.content
      }
    }
  }

  const displayBuyPsbt = async (payerAddress, successMessage) => {
    const payerCurrentMempoolTxIds = await getAddressMempoolTxIds(payerAddress);
    const interval = setInterval(async () => {
      const txId = (await getAddressMempoolTxIds(payerAddress)).find(txId => !payerCurrentMempoolTxIds.includes(txId))

      if (txId) {
        clearInterval(interval)
        toastr.success(successMessage);
      }
    }, 5_000)
  }

  async function getAddressMempoolTxIds(address) {
    return await fetch(`${baseMempoolApiUrl}/address/${address}/txs/mempool`)
      .then(response => response.json())
      .then(txs => txs.map(tx => tx.txid))
  }

  return (
    <div className='row'>

      {
        loading ? <div className="spinner-border text-primary text-center" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
          : ordinals.map(item => {
            return <div className='col-md-3 mt-3' key={item.inscriptionNumber}>
              <div className="card" style={{ height: "400px" }}>
                <iframe src={`https://static-testnet.unisat.io/preview/${item.id}`} width="100%" height="70%" scrolling="no"></iframe>
                <div className="card-body text-center">
                  <p className="card-text">Inscription #{item.inscriptionNumber}</p>
                  <button className='btn btn-primary' onClick={() => handleDetailView(item)}>Detail view</button>
                </div>
              </div>
            </div>
          })
      }
      <div className={`modal modal-lg fade${visible ? " show" : ''}`} tabIndex="-1" style={{ display: `${visible ? "block" : 'none'}` }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content bg-white">
            <div className="modal-header">
              <h5 className="modal-title">{`Inscription #${number}`}</h5>
              <button type="button" className="btn-close" onClick={() => setVisible(false)}></button>
            </div>
            <div className="modal-body">
              <div className='text-center'>
                <iframe src={`https://static-testnet.unisat.io/preview/${id}`} width="80%" scrolling="no"></iframe>
              </div>
              <div className="mb-3">
                <label htmlFor="id" className="form-label">ID</label>
                <input type="text" className="form-control" id="id" placeholder="ID" value={id} readOnly />
              </div>
              <div className="mb-3">
                <label htmlFor="id" className="form-label">Owner</label>
                <input type="text" className="form-control" id="Owner" placeholder="Owner" value={owner} readOnly />
              </div>
              <div className="mb-3">
                <label htmlFor="id" className="form-label">UTXO</label>
                <input type="text" className="form-control" id="UTXO" placeholder="UTXO" value={psbt} readOnly />
              </div>
              <div className="mb-3">
                <label htmlFor="id" className="form-label">Price</label>
                <input type="text" className="form-control" id="UTXO_Value" placeholder="Price" value={price} readOnly />
              </div>
              <div className='mb-3 d-flex gap-3 justify-content-center'>
                <button type="button" className="btn btn-primary" onClick={() => handleBuy()}>Buy</button>
                <button type="button" className="btn btn-secondary" onClick={() => setVisible(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
