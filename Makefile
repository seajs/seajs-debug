
build:
	@rm -rf dist
	@mkdir dist
	@sed "s/define(\"seajs-debug\"/define(\"seajs-debug-debug\"/" src/seajs-debug.js >dist/seajs-debug-debug.js
	@uglifyjs src/seajs-debug.js -o dist/seajs-debug.js -mc
	@make size

test:
	@make test -C ../seajs

size:
	@../seajs/tools/size.sh seajs-debug
