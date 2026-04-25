#!/bin/zsh
set -e
export HOME=/Users/tomasmartinsen
export PATH=/Users/tomasmartinsen/.local/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin
export NODE_ENV=production
cd /Users/tomasmartinsen/.hermes/control-interface
exec /usr/local/bin/node /Users/tomasmartinsen/.hermes/control-interface/server.js
