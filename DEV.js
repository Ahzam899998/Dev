const { ethers } = require("ethers");
const Web3 = require("web3");
const fs = require('fs');
const readline = require('readline');
const axios = require('axios');

const mainnet1 = 'https://cloudflare-eth.com';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';

const web31 = new Web3(new Web3.providers.HttpProvider(mainnet1));
let hit = 0;
let totalBalanceUSD = 0;
let count = 1; // Start count from 1

async function fetchETHtoUSD() {
    try {
        const response = await axios.get(COINGECKO_API_URL);
        return response.data.ethereum.usd;
    } catch (error) {
        console.error("Error fetching ETH/USD rate:", error.message);
        return null;
    }
}

// Function to log current progress
function logProgress(word, address, hit, privateKeyHex, totalBalanceUSD) {
    // Clear the console
    console.clear();
    // Log current progress
    console.log(`Checked Address ${count}:`);
    console.log(`Word: ${word}`);
    console.log(`Address: ${address}`);
    console.log(`Private Key: ${privateKeyHex}`);
    console.log(`Total USD: ${totalBalanceUSD}`);
    console.log(`Hit: ${hit}`);
    console.log('----------------ByDEV-------------------');
}

async function solve(word, address, privateKeyHex) {
    var [transaction1] = await Promise.all([
        web31.eth.getBalance(address),
    ]);

    if (transaction1 > 0) {
        hit++;
        var [balanceWei] = await Promise.all([
            web31.eth.getBalance(address),
        ]);
        // Convert wei to ether
        const balanceEth = parseFloat(ethers.utils.formatEther(balanceWei));
        const formattedBalanceEth = balanceEth.toFixed(18); // Format ETH balance with 18 decimal places
        totalBalanceUSD += formattedBalanceEth * (await fetchETHtoUSD());
        const content = `word: ${word}, privateKey: ${privateKeyHex}, address: ${address}, ETH: ${formattedBalanceEth} ETH\n`;
        fs.appendFile('FoundMultiDino.txt', content, err => {
            if (err) {
                console.error(err)
                return;
            }
        });
    }
    logProgress(word, address, hit, privateKeyHex, totalBalanceUSD.toFixed(2));
    updateWindowTitle();
    count++; // Increment count
}

async function main() {
    hit = 0; // Reset hit count
    totalBalanceUSD = 0; // Reset total balance
    count = 1; // Reset count
    const fileStream = fs.createReadStream('words.txt');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    // Counting total words loaded
    for await (const word of rl) {
        // no need to count words loaded again
    }
    
    // Display total words loaded
    console.log("Total words loaded:", count - 1); 

    // Reset the fileStream and rl for iterating again
    fileStream.destroy();
    const newStream = fs.createReadStream('words.txt');
    const newRl = readline.createInterface({
        input: newStream,
        crlfDelay: Infinity
    });

    // Iterating over words again
    for await (const word of newRl) {
        try {
            const hash = ethers.utils.id(word);
            const privateKey = ethers.utils.arrayify(hash);
            const privateKeyHex = ethers.utils.hexlify(privateKey).slice(2); // Remove '0x' prefix
            const wallet = new ethers.Wallet(privateKey);
            const address = wallet.address;
            solve(word, address, privateKeyHex);
            await new Promise(r => setTimeout(r, 50));
        } catch (e) {
            console.error(e);
        }
    }

    console.log("Total addresses checked:", hit);
    console.log("Total balance in USD:", totalBalanceUSD.toFixed(2));
}

function updateWindowTitle() {
    process.stdout.write(`\u001b]2;Count: ${count},HIT: ${hit} USD: ${totalBalanceUSD.toFixed(2)}\u0007`);
}

(async () => {
    while (true) {
        try {
            await main();
        } catch (error) {
            console.error("Error:", error.message);
            console.log("Retrying in 5 seconds...");
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
})();
