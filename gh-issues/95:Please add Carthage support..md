Please add Carthage support.
Issue filed by: lexrus
Mon Nov 16 2015 11:40:27 GMT-0500 (EST)

https://github.com/Carthage/Carthage
-------------------------------------------------------------------------------
sodastsai
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

Hi, so, as you know, Overcoat is a bridge for `AFNetworking` and `Mantle`.

AFNetworking has said it won't support Carthage. (ref: AFNetworking/AFNetworking#2552, by it's author, @mattt). Hence Overcoat could not support Carthage.

(Because I could not put `AFNetworking` into the `Cartfile` of Overcoat.)
(Another workaround is make a AFNetworking copy, rename all its classes, and then use them as Overcoat's source. But I don't think this is a good idea)

-------------------------------------------------------------------------------
sodastsai
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

Hi, so, I know `Carthage` but don't even use it.
I'd try to make it :smile:, but you're welcome to submit a PR for this. It would be great

-------------------------------------------------------------------------------
taiheng
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

I was considering trying to do this, but as you have found any AFNetworking support would be unofficial. 
For those interested there is a fork of AFNetworking with carthage support: https://github.com/Automatic/AFNetworking .

Another issue is supporting submodule functionality from cocoapods of which the contributors to Moya have found this solution involving multiple repos and using git submodules: https://github.com/Moya/Moya/issues/154

-------------------------------------------------------------------------------
pidjay
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

Carthage is coming to AFNetworking! https://github.com/AFNetworking/AFNetworking/pull/2975

-------------------------------------------------------------------------------
sodastsai
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

@pidjay Glad to see this :smile: 

-------------------------------------------------------------------------------