import React, { useEffect, useState } from 'react';
import { addDocument } from '@/utils/addData';
import { useSelector } from 'react-redux';
import { getAllDoument } from '@/utils/getAllData';

const bitcoinPriceApiUrl = "https://blockchain.info/ticker?cors=true";
let bitcoinPrice = fetch(bitcoinPriceApiUrl)
  .then(response => response.json())
  .then(data => data.USD.last)

export default function Ordinals() {

  const wallet = useSelector(state => state.wallet);

  const [ordinals, setOrdinals] = useState([]);

  const [number, setNumber] = useState(0);
  const [id, setId] = useState("");
  const [owner, setOwner] = useState("");
  const [utx0, setUtx0] = useState("");
  const [utx0Value, setUtx0Value] = useState("");
  const [price, setPrice] = useState(0);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // addData();
    loadData();
  }, []);

  const handleDetailView = async item => {
    setVisible(true);
    setNumber(item.inscriptionNumber);
    setId(item.inscriptionId);
    setOwner(item.address);
    setUtx0(item.output);
    setUtx0Value(item.outputValue / Math.pow(10, 8) + "BTC" + `($${(utx0Value * await bitcoinPrice).toFixed(2)})`);
  }

  const loadData = async () => {
    setLoading(true);
    const { result, error } = await getAllDoument("ordinals");
    if (!error) setOrdinals(result);
    setLoading(false);
  }

  // const addData = async () => {
  //   const item = {
  //     owner: "owner",
  //     price: 100,
  //     psbt: "mypsbt"
  //   }
  //   const { result, error } = await addDocument("ordinals", "1234567", item);
  //   console.log(result.data(), error);;
  // }

  const handleBuy = () => {

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
      value: dummyUtxo.value + Number(inscription['output value']),
    });

    // Add payer signed input
    psbt.addInput({
      ...sellerSignedPsbt.data.globalMap.unsignedTx.tx.ins[0],
      ...sellerSignedPsbt.data.inputs[0]
    })
    // Add payer output
    psbt.addOutput({
      ...sellerSignedPsbt.data.globalMap.unsignedTx.tx.outs[0],
    })

    // Add payment utxo inputs
    for (const utxo of paymentUtxos) {
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
      totalPaymentValue += utxo.value
    }

    // Create a new dummy utxo output for the next purchase
    psbt.addOutput({
      address: payerAddress,
      value: dummyUtxoValue,
    })

    const fee = calculateFee(psbt.txInputs.length, psbt.txOutputs.length, await recommendedFeeRate)

    const changeValue = totalValue - dummyUtxo.value - price - fee

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

  return (
    <div className='row'>

      {
        loading ? <div className="spinner-border text-primary text-center" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
          : ordinals.map(item => {
            return <div className='col-md-3 mt-3' key={item.inscriptionNumber}>
              <div className="card" style={{ height: "400px" }}>
                <iframe src={`https://static-testnet.unisat.io/preview/${item.inscriptionId}`} width="100%" height="70%" scrolling="no"></iframe>
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
                <input type="text" className="form-control" id="UTXO" placeholder="UTXO" value={utx0} readOnly />
              </div>
              <div className="mb-3">
                <label htmlFor="id" className="form-label">UTXO Value</label>
                <input type="text" className="form-control" id="UTXO_Value" placeholder="UTXO Value" value={utx0Value} readOnly />
              </div>
              <div className='mb-3 d-flex gap-3 justify-content-center'>
                <button type="button" className="btn btn-primary" onClick={() => handleClickSell()}>Buy</button>
                <button type="button" className="btn btn-secondary" onClick={() => setVisible(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
