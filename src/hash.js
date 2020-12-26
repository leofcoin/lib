import IPLDLFCTx from 'ipld-lfc-tx'
import ipldLfc from 'ipld-lfc'
import CID from 'cids'
import Errors from './errors'
import cryptoJs from 'crypto-js';

const { LFCNode, util } = ipldLfc
const {SHA256} = cryptoJs

const _SHA256 = (object) => {
  return SHA256(JSON.stringify(object)).toString();
}

/**
 * @extends {Validator}
 * @example
 * const hash = new Hash()
 */
export default class Hash extends Errors {
	constructor() {
		super()
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
	  const cid = await util.cid(await util.serialize(await new LFCNode({...block})))
	  return cid.toBaseEncodedString();
	}

	/**
	 * Generate transaction hash
	 *
	 * @param {object} transaction {id, type, inputs, outputs}
	 */
	async transactionHash(transaction) {
		const tx = await new IPLDLFCTx.LFCTx(transaction)
		const cid = await IPLDLFCTx.util.cid(await tx.serialize())
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
