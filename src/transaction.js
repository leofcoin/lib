import Validator from './validate.js'
import Errors from './errors.js'
import Hash from './hash.js'
import { randomBytes } from 'crypto'
import MultiWallet from '@leofcoin/multi-wallet'
import { network, reward } from './params.js';
import * as ipldLfcTx from 'ipld-lfc-tx';

const { LFCTx, util } = ipldLfcTx



export default class Transaction extends Hash {
  constructor() {
    super()
  }
  
  
  /**
   * Create transaction
   *
   * @param inputs
   * @param outputs
   * @param reward
   * @return {{id: string, reward: boolean, inputs: *, outputs: *, hash: string}}
   */
  async newTransaction(inputs, outputs, reward = null) {
    try {
      const tx = new LFCTx({
        id: randomBytes(32).toString('hex'),
        time: Math.floor(new Date().getTime() / 1000),
        reward,
        outputs,
        inputs
      });
      // const cid = await util.cid(tx.serialize())
      // await global.ipfs.dag.put(tx, {format: util.codec, hashAlg: util.defaultHashAlg, version: 1, baseFormat: 'base58btc'})
      return tx
    } catch (e) {
      throw e
    }
  }
  
  /**
   * Create reward transaction for block mining
   *
   * @param {string} address
   * @param {number} height
   * @return {id: string, reward: boolean, inputs: *, outputs: *, hash: string}
   */
  async createRewardTransaction(address, amount) {
    return this.newTransaction([], [{index: 0, amount, address}], 'mined');
  }
  
  /**
   * validate transaction
   *
   * @param multihash
   * @param transaction
   * @param unspent
   */
  async validateTransaction(multihash, transaction, unspent) {
  	if (!transaction.reward) delete transaction.reward
  	const outputs = transaction.outputs.map(o => {
  		// TODO: fix script
  		if (!o.script) delete o.script
  		return o
  	})
  	transaction.outputs = outputs
  	if (!transaction.script) delete transaction.script
  	if (!isValid('transaction', transaction)) throw this.TransactionError('Invalid transaction');
  	if (multihash !== await this.transactionHash(transaction)) throw this.TransactionError('Invalid transaction hash');
  	// TODO: versions should be handled here...
  	// Verify each input signature
  	
  	if (transaction.inputs) {
  		transaction.inputs.forEach(input => {
  	  	const { signature, address } = input;
  			const hash = this.transactionInputHash(input);
  
  	  	let wallet = new MultiWallet(network);
  	    wallet.fromAddress(address, null, network);
  			
  			if (!wallet.verify(Buffer.from(signature, 'hex'), Buffer.from(hash, 'hex')))
  				throw this.TransactionError('Invalid input signature');
  		});
  	
  		// Check if inputs are in unspent list
  		transaction.inputs.forEach((input) => {
  			if (!unspent.find(out => out.tx === input.tx && out.index === input.index)) { throw this.TransactionError('Input has been already spent: ' + input.tx); }
  		});	
  	}
  	
  	if (transaction.reward === 'mined') {
  		// For reward transaction: check if reward output is correct
  		if (transaction.outputs.length !== 1) throw this.TransactionError('Reward transaction must have exactly one output');
  		if (transaction.outputs[0].amount !== reward) throw this.TransactionError(`Mining reward must be exactly: ${reward}`);
  	} else if (transaction.inputs) {
  		// For normal transaction: check if total output amount equals input amount
  		if (transaction.inputs.reduce((acc, input) => acc + input.amount, 0) !==
        transaction.outputs.reduce((acc, output) => acc + output.amount, 0)) { throw this.TransactionError('Input and output amounts do not match'); }
  	}
  
  	return true;
  }
  
  /**
   * validate transactions list for current block
   *
   * @param {array} transactions
   * @param unspent
   */
  async validateTransactions(transactions, unspent) {
  	const _transactions = []
  	for (const {multihash} of transactions) {
  		const tx = await leofcoin.transaction.dag.get(multihash)
  		_transactions.push({multihash, value: tx.toJSON()})
  		
  	}
  	for (const {value, multihash} of _transactions) {
  		// TODO: fix value.scrip
  		await this.validateTransaction(multihash, value, unspent)
  	}
  	
  	if (_transactions.filter(({value}) => value.reward === 'mined').length !== 1)
  		throw this.TransactionError('Transactions cannot have more than one reward')	
  }
  
  /**
   * Verify signature
   *
   * @param {string} address - signer address
   * @param {string} signature - signature to verify
   * @param {string} hash - transaction hash
   */
  verifySignature(address, signature, hash) {
  	const wallet = new MultiWallet(network);
  	return wallet.verify(signature, hash, address);
  }
  
  /**
   * Create and sign input
   *
   * @param transaction Based on transaction id
   * @param index Based on transaction output index
   * @param amount
   * @param wallet
   * @return {transaction, index, amount, address}
   */
  createInput(transaction, index, amount, wallet) {
  	const input = {
  		transaction,
  		index,
  		amount,
  		address: wallet.address,
  	};
  	input.signature = wallet.sign(Buffer.from(this.transactionInputHash(input), 'hex')).toString('hex');
  	return input;
  }
  
  /**
   * Create a transaction
   *
   * @param wallet
   * @param toAddress
   * @param amount
   * @return {id, reward, inputs, outputs, hash,}
   */
  async buildTransaction(wallet, toAddress, amount, unspent) {
  	let inputsAmount = 0;
  	// const unspent = await this.getUnspentForAddress(wallet.address);
  	const inputsRaw = unspent.filter(i => {
  		const more = inputsAmount < amount;
  		if (more) inputsAmount += i.amount;
  		return more;
  	});
  	if (inputsAmount < amount) throw this.TransactionError('Not enough funds');
  	// TODO: Add multiSigning
  	const inputs = inputsRaw.map(i => this.createInput(i.tx, i.index, i.amount, wallet));
  	// Send amount to destination address
  	const outputs = [{index: 0, amount, address: toAddress}];
  	// Send back change to my wallet
  	if (inputsAmount - amount > 0) {
  		outputs.push({index: 1, amount: inputsAmount - amount, address: wallet.address});
  	}
  	return this.newTransaction(inputs, outputs);
  }
}
