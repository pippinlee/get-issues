Automatic serialization of Mantle objects for PUT, POST, etc.
Issue filed by: eytanbiala
Mon Nov 16 2015 11:40:27 GMT-0500 (EST)

Is there anyway to automatically serialize Mantle objects to JSON?
Currently you need to do something like this:

```
-(PMKPromise *)postMantleObject:(MyMantleObject *)mantleObject
{
	Request *request = [Request requestWithType:ABC];
	
	NSDictionary *json = [MTLJSONAdapter JSONDictionaryFromModel:mantleObject];    

	return [self POST:request.path parameters:json].then(^(OVCResponse *response) {
		return response.result;
	});
}
```

Is it possible to configure Overcoat to do so automatically, so something like this is possible: 

```
-(PMKPromise *)postMantleObject:(MyMantleObject *)mantleObject
{
    Request *request = [Request requestWithType:ABC];
    
    return [self POST:request.path parameters:mantleObject].then(^(OVCResponse *response) {
        return response.result;
    });
}
```
-------------------------------------------------------------------------------
3-n
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

I believe you have the same issue I already had, and still have ;)

https://github.com/gonzalezreal/Overcoat/issues/29

-------------------------------------------------------------------------------
eytanbiala
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

I think it is a bit different. I am already setting the requestSerializer for my `OVCHTTPSessionManager` subclass (`self.requestSerializer = [AFJSONRequestSerializer serializer];`), and that works fine when the request body is an NSDictionary or NSArray.

I'm looking to have Overcoat automatically serialize Mantle objects for request bodies.

-------------------------------------------------------------------------------