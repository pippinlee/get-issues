Result null for valid request
Issue filed by: ruddfawcett
Mon Nov 16 2015 11:40:27 GMT-0500 (EST)

I perform a `POST` request to an endpoint, which spits out a valid result every time (I have tested extensively with an HTTP client).  Yet I get the following when trying to debug a `nil` model:
```
2015-10-24 18:48:11.880 AppName[60332:1645100] <OVCResponse: 0x7f8de8f08930> {
    HTTPResponse = "<NSHTTPURLResponse: 0x7f8de8d55be0> { URL: http://localhost:8080/api/v1/users/authenticate } { status code: 200, headers {\n    \"Access-Control-Allow-Origin\" = \"*\";\n    Connection = \"keep-alive\";\n    \"Content-Length\" = 1109;\n    \"Content-Type\" = \"application/json\";\n    Date = \"Sat, 24 Oct 2015 22:48:11 GMT\";\n    \"X-Powered-By\" = Express;\n    \"access-control-allow-headers\" = \"X-Requested-With\";\n} }";
    result = "<null>";
    resultClass = XYModelClass;
}
```
AKA, `result = "<null>";`.  I have found that if I change the status code server side to `400`, `403`, or really an other status code than `200`, I can log a non `"<null>"`  result...  However nothing for `200`.  Any ideas/suggestions?
-------------------------------------------------------------------------------
sodastsai
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

Hi, could I see the JSON output of the URL at `http://localhost:8080/api/v1/users/authenticate` and also the implementation of `+ (NSDictionary *)JSONKeyPathsByPropertyKey` in the `XYModelClass` class?

Thanks.

-------------------------------------------------------------------------------
ruddfawcett
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

Hey @sodastsai thanks for the quick reply...

Here's what my JSON looks like:

```json
{
    "token": "USER TOKEN",
    "user": {
        "id": "562bcbe3cc27e1f5df000002",
        "email": "test@test.org",
        "updated_at": "2015-10-24T18:20:19.684Z",
        "created_at": "2015-10-24T18:20:19.681Z",
        "name": {
            "first": "First",
            "last": "Last"
        }
    }
}
```

And the model class is:

```obj-c
+ (NSDictionary *)JSONKeyPathsByPropertyKey {
    return @{
             @"token" : @"token",
             @"user" : @"user"
             };
}

+ (NSValueTransformer *)userJSONTransformer {
    return [MTLJSONAdapter dictionaryTransformerWithModelClass:XYUser.class];
}
```

-------------------------------------------------------------------------------
sodastsai
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

Excuse me for another question, is the `user` dictionary valid for Mantle?

i.e. I mean is 
```json
{
    "id": "562bcbe3cc27e1f5df000002",
    "email": "test@test.org",
    "updated_at": "2015-10-24T18:20:19.684Z",
    "created_at": "2015-10-24T18:20:19.681Z",
    "name": {
        "first": "First",
        "last": "Last"
    }
}
```
valid for `MTLJSONSerializer` to convert to a model instance?

-------------------------------------------------------------------------------
sodastsai
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

if possible, could you set a breakpoint at [`+[OVCResponse responseWithHTTPResponse:JSONObject:resultClass:error:]`](https://github.com/Overcoat/Overcoat/blob/master/sources/Core/OVCResponse.m#L46) to check why the `result` property is nil?

Thanks.

-------------------------------------------------------------------------------