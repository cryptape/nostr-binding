#!/bin/bash
ckb-cli --url https://mainnet.ckb.dev deploy sign-txs \
    --from-account ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqtp83cu4pk8nysm9dngxezw546dyr5w8esx7rlyt \
    --add-signatures \
    --info-file info.json
