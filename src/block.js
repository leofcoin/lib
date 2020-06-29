import { GENESISBLOCK, genesisCID } from './params';
import Transaction from './transaction'
import Hash from './hash';
import ipldLfc from 'ipld-lfc';

const { LFCNode } = ipldLfc

const createRewardTransaction = new Transaction().createRewardTransaction
const blockHash = new Hash().blockHash

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

export const longestChain = () => new Promise(async (resolve, reject) => {
  
  try {
    let peers = await ipfs.swarm.peers()
    console.log(peers);
    peers = await filterPeers(peers, globalThis.peerId)
    console.log(peers);
    // if (peers.length < 2) return setTimeout(async () => {
    //   const res = await longestChain()
    //   resolve(res)
    // }, 100);
    
    const set = []
    for (const {peer} of peers) {
      const chunks = []
      try {
        for await (const chunk of ipfs.name.resolve(peer)) {
          chunks.push(chunk)
        }
      } catch (e) {
        console.warn(e)
      }
      if (chunks.length > 0) set.push({peer, path: chunks});
    }
    const _peers = []
    let _blocks = []
    for (const {peer, path} of set) {    
      if (_peers.indexOf(peer) === -1) {
        _peers.push(peer)
        const block = await leofcoin.block.dag.get(path[0] || path)      
        _blocks.push({block, path: path[0] || path})        
      }        
    }
    const localIndex = await chainStore.get('localIndex')
    const localHash = await chainStore.get('localBlock')
    console.log({localHash});
    const history = {}
    _blocks = _blocks.reduce((set, {block, path}) => {
      if (set.block.index < block.index) {
        history[set.block.index] = set;
        set.block = block
        set.hash = path.replace('/ipfs/', '')
        set.seen = 1
      } else if (set.block.index === block.index) {
        set.seen = Number(set.seen) + 1
      }
      return set
    }, {block: { index: localIndex }, hash: localHash, seen: 0})
    // temp 
    // if (_blocks.seen < 2) {
    //   _blocks = history[_blocks.block.index - 1]
    // 
    // }
    // const localIndex = await chainStore.get('localIndex')
    // const localHash = await chainStore.get('localBlock')
    return resolve({index: _blocks.block.index, hash: _blocks.hash})
    
  } catch (e) {
    console.warn(e);
    debug(e)
    reject(e)
  }
});

export const lastBlock = () => new Promise(async (resolve, reject) => {
  const result = await longestChain();
  
  resolve(result); // retrieve links
});

/**
	 * Create new block
	 *
	 * @param {array} transactions
	 * @param {object} previousBlock
	 * @param {string} address
	 * @return {index, prevHash, time, transactions, nonce}
	 */
export const newBlock = async ({transactions = [], previousBlock, address}) => {
	const index = previousBlock.index + 1
	const minedTx = await createRewardTransaction(address, index)
	transactions.push(minedTx);
	this.data = {
		index,
		prevHash: previousBlock.hash,
		time: Math.floor(new Date().getTime() / 1000),
		transactions,
		nonce: 0
	};
	this.data.hash = await blockHash(this.data);
	return this.data;
}

export const nextBlock = async address => {
  let transactions;
  let previousBlock;
  try {
    previousBlock = await lastBlock()
    
    if (previousBlock.index > chain.length - 1) {
      await leofcoin.chain.sync()
      previousBlock = await lastBlock()
    }
    if (!previousBlock.index) previousBlock = chain[chain.length - 1]
    
    transactions = await nextBlockTransactions();
  } catch (e) {
    debug(e)
    previousBlock = GENESISBLOCK
    previousBlock.hash = genesisCID
    transactions = await nextBlockTransactions();
  } finally {
    // console.log(transactions, previousBlock, address);
    return await new DAGBlock(global.ipfs).newBlock({transactions, previousBlock, address});
  }
};

const goodBlock = (block, difficulty) => new Promise(async (resolve, reject) => {
  // return setTimeout(async () => {
    block.hash = await blockHash(block);
    if (parseInt(block.hash.substring(0, 8), 16) >= difficulty) {
      block.nonce++
      block = await goodBlock(block, difficulty)
    }      
    resolve(block)
  // }, 500);
})

/**
 * Create a new genesis block
 */
export const newGenesisDAGNode = async (difficulty = 1, address = Buffer.alloc(32).toString('hex')) => {
  let block = {
    index: 0,
    prevHash: Buffer.alloc(47).toString('hex'),
    time: Math.floor(new Date().getTime() / 1000),
    transactions: [
      // ms.unspent(network, [], wallet.account()).create(index: 0, amount: consensusSubsidy(0), address)
    ],
    nonce: 0
  }
  block.hash = await blockHash(block);
  block = await goodBlock(block, difficulty)
  console.log({block});
  const node = new LFCNode(block)
  return node;
}