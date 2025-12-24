#!/bin/bash
set -ex
cd ../../.. && shasum -a 256 -c checksums.txt && cd -

ckb-cli --url https://mainnet.ckb.dev deploy gen-txs \
    --deployment-config ./deployment.toml \
    --migration-dir ./migrations \
    --fee-rate 1600 \
    --from-address ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsqtp83cu4pk8nysm9dngxezw546dyr5w8esx7rlyt \
    --info-file info.json
