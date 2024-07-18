#!/bin/bash

ckb-cli --url https://testnet.ckb.dev deploy apply-txs --migration-dir ./migrations --info-file info.json
