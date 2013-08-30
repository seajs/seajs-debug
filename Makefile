
build:
	@seatools build

test:
	@seatools site
	@seatools test --local
	@seatools test --http

size:
	@seatools size
