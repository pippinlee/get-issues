Error response class doesn't seem functional
Issue filed by: ericlewis
Mon Nov 16 2015 11:40:27 GMT-0500 (EST)

I can't seem to get this working at all, is there some sort of trick to it? Even the twitter example crashes and burns. but sort of seems to work.
-------------------------------------------------------------------------------
ericlewis
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

here is an example error json: 
{"success":false,"error":{"id":97,"message":"Sorry, we couldn't find any offers for you."}}

and our class we tried JSON key path we tried:  @"message" : @"error.message".

is this not possible? I added it as an error response class, tried making it to be more like the examples. I'm at a loss.


-------------------------------------------------------------------------------
gonzalezreal
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

I will look into it.

-------------------------------------------------------------------------------
muxa
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

I had the same problem and it turned out to be a missing -ObjC linker flag on my main project.

-------------------------------------------------------------------------------