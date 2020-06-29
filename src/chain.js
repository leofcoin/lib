import { GENESISBLOCK } from './params'
import Validator from './validate'
const invalidTransactions = {};

globalThis.chain = globalThis.chain || [
  GENESISBLOCK
];

globalThis.mempool = globalThis.mempool || [];
globalThis.blockHashSet = globalThis.blockHashSet || [];

export default class Chain {
  constructor() {
    this.validateTransaction = new Validator().validateTransaction
  }
  
  get chain() { return globalThis.chain }
  
  get mempool() { return globalThis.mempool }
  
  get blockHashSet() { return globalThis.blockHashSet }
  
  // TODO: needs 3 nodes running
  invalidTransaction(data) {
    // console.log(data.data.toString());
    data = JSON.parse(data.data.toString());
    if (!invalidTransactions[data.tx]) invalidTransactions[data.tx] = 0;
    ++invalidTransactions[data.tx]
    const count = invalidTransactions[data.tx];
    if (count === 3) {
      const memIndex = mempool.indexOf(data)
      mempool.splice(memIndex, 1)
      delete invalidTransactions[data.tx];
    }
  }
  
  async getTransactions(withMempool = true, index = 0) {
    const _chain = [...chain];
    if (index === chain.length - 1) return []
    _chain.slice(index + 1, chain.length - 1)
  	let transactions = _chain.reduce((transactions, block) => [ ...transactions, ...block.transactions], []);
  	if (withMempool) transactions = transactions.concat(mempool);
    let _transactions = []
    // TODO: deprecated, get/put should be handled in core
    for (const tx of transactions) {
      const {multihash} = tx
      if (multihash) {
        let value;
        if (leofcoin.transaction.dag) value = await leofcoin.transaction.dag.get(multihash)
        _transactions.push(value)
      } else {
        _transactions.push(tx)
      }
      
    }
    return _transactions
  };
  
  async getTransactionsForAddress(address, index = 0) {
    const transactions = await this.getTransactions(false, index);
  	return transactions.filter(tx => tx.inputs.find(i => i.address === address) ||
    tx.outputs.find(o => o.address === address));
  };
  
  /**
   * 
   * @param {string} withMempool - with or without mempool inclusion
   * @param {number} index - block height to start from
   */
  async getUnspent(withMempool = false, index = 0) {
  	const transactions = await this.getTransactions(withMempool, index);
  	// Find all inputs with their tx ids
  	const inputs = transactions.reduce((inputs, tx) => inputs.concat(tx.inputs), []);
  
  	// Find all outputs with their tx ids
  	const outputs = transactions.reduce((outputs, tx) =>
  		outputs.concat(tx.outputs.map(output => Object.assign({}, output, {tx: tx.id}))), []);
  
  	// Figure out which outputs are unspent
  	const unspent = outputs.filter(output =>
  		typeof inputs.find(input => input.tx === output.tx && input.index === output.index && input.amount === output.amount) === 'undefined');
  	return unspent;
  }
  
  /**
   * @param {string} address - wallet address
   * @param {number} index - block height to start from
   */
  async getUnspentForAddress(address = null, index = 0) {
    const unspent = await this.getUnspent(true, index)
  	return unspent.filter(u => u.address === address);
  }
  
  /**
   * @param {string} address - wallet address
   */
  async getBalanceForAddress(address = null, index) {
    // debug(`Getting balance for ${address}`)
    const unspent = await this.getUnspentForAddress(address, index)
    const amount = unspent.reduce((acc, u) => acc + u.amount , 0);
    // debug(`Got ${amount} for ${address}`)
  	return amount
  }
  
  /**
   * @deprecated Use getTransactionsForAddress(addr, index) instead
   *
   * @param {string} address - wallet address
   * @param {number} index - block height to start from
   * 
   * @return {number} balance
   */
  async getBalanceForAddressAfter(address = null, index = 0) {
    // debug(`Getting balance for ${address} @${index}`)
    const unspent = await this.getUnspentForAddress(address, index)
    const amount = unspent.reduce((acc, u) => acc + u.amount , 0);
    // debug(`Got ${amount} for ${address} @${index}`)
    return amount
  }
  
  median(array) {
    array.sort((a,b) => a - b)
  
    var half = Math.floor(array.length / 2);
  
    if(array.length % 2)
      return array[half];
    else
      return (array[half - 1] + array[half]) / 2.0;
  }
  
  difficulty() {
  	// TODO: lower difficulty when transactionpool contain more then 500 tx ?
  	// TODO: raise difficulty when pool is empty
  
    // or
  
    // TODO: implement iTX (instant transaction)
    // iTX is handled by multiple peers, itx is chained together by their hashes
    // by handlng a tx as itx the block well be converted into a iRootBlock
    // this results into smaller chains (tangles, tails) which should improve
    // resolving transactions, wallet amounts etc ...
  	const start = chain.length >= 128 ? (chain.length - 128) : 0;
  	const blocks = chain.slice(start, (chain.length - 1)).reverse();
  	const stamps = [];
  	for (var i = 0; i < blocks.length; i++) {
  		if (blocks[i + 1]) {
  			stamps.push(blocks[i].time - blocks[i + 1].time);
  		}
  	}
  	if (stamps.length === 0) {
  		stamps.push(10);
  	}
  	let blocksMedian = this.median(stamps) || 10;
    const offset = blocksMedian / 10
     // offset for quick recovery
  	if (blocksMedian < 10) {
  		blocksMedian -= (offset / 2);
  	} else if (blocksMedian > 10) {
  		blocksMedian += (offset * 2);
  	}
    if (blocksMedian < 0) blocksMedian = -blocksMedian
    console.log(`Average Block Time: ${blocksMedian}`);
    console.log(`Difficulty: ${10 / blocksMedian}`);
  	return (1000 / (10 / blocksMedian));
  };//10000
  
  
  /**
   * Get the transactions for the next Block
   *
   * @return {object} transactions
   */
  async nextBlockTransactions() {
  	const unspent = await this.getUnspent(false);
  	return mempool.filter(async (transaction) => {
      const multihash = transaction.multihash
      const value = await leofcoin.transaction.get(multihash)
      console.log({value});
  		try {
  			await this.validateTransaction(multihash, value, unspent);
        return transaction
  		} catch (e) {
        globalThis.ipfs.pubsub.publish('invalid-transaction', Buffer.from(JSON.stringify(transaction)));
  			console.error(e);
  		}
  	});
  };
}