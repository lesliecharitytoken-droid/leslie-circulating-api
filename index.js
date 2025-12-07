require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();

// LESLIE settings 🦏
const CONTRACT_ADDRESS = "0xcc9e0bd9438ca0056653d134de794abeaff8c676";
const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const DECIMALS = 9n;
const MAX_SUPPLY_TOKENS = 10000000000n; // 10 miliardi LESLIE

// Max supply in unità on-chain
const MAX_SUPPLY_RAW = MAX_SUPPLY_TOKENS * 10n ** DECIMALS;

// Utility: formatta BigInt in stringa decimale
function formatUnits(valueBigInt, decimals) {
  const base = 10n ** decimals;
  const integerPart = valueBigInt / base;
  const fractionalPart = valueBigInt % base;

  if (fractionalPart === 0n) return integerPart.toString();

  let fracStr = fractionalPart.toString().padStart(Number(decimals), "0");
  fracStr = fracStr.replace(/0+$/, "");
  return `${integerPart.toString()}.${fracStr}`;
}

// 👉 Endpoint: GET /circulating-supply
app.get("/circulating-supply", async (req, res) => {
  try {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "ETHERSCAN_API_KEY non configurata" });
    }

    // 🔗 Etherscan API V2
    // https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokenbalance...
    const response = await axios.get("https://api.etherscan.io/v2/api", {
      params: {
        chainid: 1, // Ethereum mainnet
        module: "account",
        action: "tokenbalance",
        contractaddress: CONTRACT_ADDRESS,
        address: BURN_ADDRESS,
        tag: "latest",
        apikey: apiKey,
      },
    });

    const data = response.data;

    if (data.status !== "1") {
      return res.status(500).json({
        error: "Errore da Etherscan",
        message: data.message,
        result: data.result,
      });
    }

    // result = balance in unità minime (string)
    const burnedRaw = BigInt(data.result);

    // circulating = maxSupply - burned
    const circulatingRaw = MAX_SUPPLY_RAW - burnedRaw;

    const maxSupply = formatUnits(MAX_SUPPLY_RAW, DECIMALS);
    const burned = formatUnits(burnedRaw, DECIMALS);
    const circulating = formatUnits(circulatingRaw, DECIMALS);

  return res.send(circulating);

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Errore interno",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LESLIE circulating supply API (v2) su http://localhost:${PORT}`);
});
