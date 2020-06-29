import IPLDLFCTx from 'ipld-lfc-tx'
import ipldLfc from 'ipld-lfc'
import CID from 'cids'
const { LFCNode, util } = ipldLfc

export default class Hash {
	constructor() {
		
	}
	
	hashFromMultihash(multihash) {
	  const cid = new CID(multihash.replace('/ipfs/', ''))
	  return cid.multihash.slice(cid.prefix.length / 2).toString('hex')
	}
	
	multihashFromHash(hash) {
	  const cid = new CID(1, 'leofcoin-block', Buffer.from(`1d40${hash}`, 'hex'), 'base58btc');
	  return cid.toBaseEncodedString();
	}
	
	async blockHash(block) {
	  block = await new LFCNode(block);
	  const cid = await util.cid(block.serialize())
	  return hashFromMultihash(cid.toBaseEncodedString());
	}
	
	/**
	 * Generate transaction hash
	 *
	 * @param {object} transaction {id, type, inputs, outputs}
	 */
	async transactionHash(transaction) {
		const tx = new IPLDLFCTx.LFCTx(transaction)
		const cid = await IPLDLFCTx.util.cid(tx.serialize())
		return cid.toBaseEncodedString()
	}

	/**
	 * Generate transaction input hash
	 *
	 * @param {object} transactionInput {transaction, index, amount, address}
	 */
	transactionInputHash(transactionInput) {
		const {tx, index, amount, address} = transactionInput;
		return _SHA256({tx, index, amount, address});
	}

}


