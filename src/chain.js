import { GENESISBLOCK, genesisCID, consensusSubsidyInterval, reward } from './params'
import Block from './block'

const invalidTransactions = {};

globalThis.chain = globalThis.chain || [
  GENESISBLOCK
];

globalThis.mempool = globalThis.mempool || [];
globalThis.blockHashSet = globalThis.blockHashSet || [];

const filterPeers = (peers, localPeer) => {
  const set = []
  return peers.reduce((p, c) => {
    if (set.indexOf(c.peer) === -1 && c.peer !== localPeer) {
      set.push(c.peer)
      p.push(c)
    }
    return p
  }, [])
}

/**
 * @extends {Block}
 * @example
 * const chain = new Chain()
 */
export default class Chain extends Block {
  constructor() {
    super()
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

  /**
   * @param {number} height
   */
  consensusSubsidy(height) {
    // console.log(height);
  	const quarterlings = height / consensusSubsidyInterval;
  	if (quarterlings >= 256) {
  		return 0;
  	}
  	//subsidy is lowered by 12.5 %, approx every year
  	const minus = quarterlings >= 1 ? (quarterlings * (reward / 256)) : 0;
  	return reward - minus;
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
        if (leofcoin.api.transaction) value = await leofcoin.api.transaction.get(multihash)
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
   * @param {String} address - wallet address
   * @param {number} index - block height to start from
   */
  async getUnspentForAddress(address = null, index = 0) {
    const unspent = await this.getUnspent(true, index)
  	return unspent.filter(u => u.address === address);
  }

  /**
   * @param {String} address - wallet address
   * @param {Number} index - Block index to get balance after
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
  	return (10000 / (10 / blocksMedian));
  };//10000


  /**
   * Get the transactions for the next Block
   *
   * @return {object} transactions
   */
  async nextBlockTransactions() {

  	try {
      const unspent = await this.getUnspent(false);
      return mempool.filter(async transaction => {
        const multihash = transaction.multihash
        const value = await leofcoin.api.transaction.get(multihash)
    		try {
    			await this.validateTransaction(multihash, value.toJSON(), unspent);
          return value.toJSON()
    		} catch (e) {
          globalThis.pubsub.publish('invalid-transaction', Buffer.from(JSON.stringify(transaction)));
    			console.error(e);
    		}
    	});
    } catch (e) {
      throw new Error(e)
    }
  }

  longestChain() {
    return new Promise(async (resolve, reject) => {
      try {
        // TODO: peernet.id => peer.id
        let peers = await filterPeers([...peernet.peers], peernet.id)
        let set = []
        const request = new globalThis.peernet.protos['peernet-request']({
          request: 'lastBlock'
        })

        for (const peer of peers) {
          const to = peernet._getPeerId(peer.id)
          if (to) {
            const node = await peernet.prepareMessage(to, request.encoded)
            let response = await peer.request(node.encoded)
            const proto = new globalThis.peernet.protos['peernet-message'](Buffer.from(response.data))
            response = new globalThis.peernet.protos['peernet-response'](Buffer.from(proto.decoded.data))
            const block = JSON.parse(response.decoded.response)
            set.push({peer, block})
          }
        }
        let localIndex
        let localHash
        try {
          const index = await chainStore.get('localIndex')
          const hash = await chainStore.get('localBlock')
          localIndex = Number(index.toString())
          localHash = hash.toString()
        } catch (e) {
          localIndex = 0;
          localHash = genesisCID;
          await chainStore.put('localIndex', 0)
          await chainStore.put('localBlock', genesisCID)
        }

        set = set.reduce((p, c) => {
          if (Number(c.height) > Number(p.height)) {
            c.seen = 1
            return c
          } else if (Number(c.height) === Number(p.height)) {
            p.seen += 1
          }
          return p
        }, { height: localIndex, hash: localHash, seen: 0})

        // temp
        // if (_blocks.seen < 2) {
        //   _blocks = history[_blocks.block.index - 1]
        //
        // }
        // const localIndex = await chainStore.get('localIndex')
        // const localHash = await chainStore.get('localBlock')
        return resolve({index: set.height, hash: set.hash})

      } catch (e) {
        console.warn(e);
        // debug(e)
        reject(e)
      }
    })
  }

  /**
   * Resolve latest block from the longest chain.
   * @return Promise(resolve(block))
   */
  lastBlock() {
    return new Promise(async (resolve, reject) => {
      const result = await this.longestChain();

      resolve(result); // retrieve links
    });
  }

  /**
   * @param {String} address
   * @return {Function} newBlock
   */
  async nextBlock(address) {
    let transactions;
    let previousBlock;
    try {
      previousBlock = await this.lastBlock()

      if (previousBlock.index > chain.length - 1) {
        await leofcoin.api.chain.sync()
        previousBlock = await this.lastBlock()
      }
      if (!previousBlock.index) previousBlock = chain[chain.length - 1]
      transactions = await this.nextBlockTransactions();
    } catch (e) {
      previousBlock = GENESISBLOCK
      previousBlock.hash = genesisCID
      transactions = await this.nextBlockTransactions();
    } finally {
      // console.log(transactions, previousBlock, address);
      return await this.newBlock({transactions, previousBlock, address});
    }
  }

  /**
	 * Create new block
	 *
	 * @param {Array} transactions - transactions
	 * @param {Object} previousBlock - previousBlock
	 * @param {String} address - address
	 * @return {Object} index, prevHash, time, transactions, nonce
	 */
  async newBlock({transactions = [], previousBlock, address}) {
  	const index = previousBlock.index + 1
  	const minedTx = await this.createRewardTransaction(address, this.consensusSubsidy(index))
  	transactions.push(minedTx.toJSON());
  	this.data = {
  		index,
  		prevHash: previousBlock.hash,
  		time: Math.floor(new Date().getTime() / 1000),
  		transactions,
  		nonce: 0
  	}

  	this.data.hash = await this.blockHash({...this.data});

  	return this.data;
  }
}
