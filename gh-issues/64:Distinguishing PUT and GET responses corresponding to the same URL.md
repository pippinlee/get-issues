Distinguishing PUT and GET responses corresponding to the same URL
Issue filed by: priyarajagopal
Mon Nov 16 2015 11:40:27 GMT-0500 (EST)

Hi
So I have a URL http://server/api/v1/users . This URL can be used to GET  a list of user names or it can be used to PUT a list of users (the users are specified in the request body). This is quite common in RESTful services. The response to the GET and PUT requests are naturally different. How do I use Overcoat to distinguish between the GET and PUT response corresponding to the same URL ? Right now, Overcoat tries to map the PUT response to the object that I've specified in modelClassesByResourcePath for the GET query. Help please!
thanks!
-------------------------------------------------------------------------------
tomermobli
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

hello
Can you share how you solved it?

-------------------------------------------------------------------------------
CeccoCQ
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

Hi,
have you solved?

-------------------------------------------------------------------------------
tomermobli
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

I "solved" it by removing Overcoat... and manually parse the response with MTLJSONAdapter

-------------------------------------------------------------------------------
GorkaMM
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

@priyarajagopal How did you finally solve this?

-------------------------------------------------------------------------------
sodastsai
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

Hi guys, 

though this is an issue long ago, I'd like to support this in Overcoat. (I'm new maintainer since this summer.)

I have a purpose that the URLMatcher would be configured like:
```objective-c
+ (NSDictionary *)modelClassesByResourcePath {
    return @{
        @"model": [OVCTestModel class],
        @"path": [OVCURLMatcherNode nodeWithClassesByHTTPRequestMethods:@{
            @"*": [SomeModel class],
            @"GET": [SomeGetModel class],
            @"PUT": [SomePutModel class],
        }],
    };
}
```

So all requests to URL like `http://api.example.com/model` would still use `OVCTestModel` for the response.
And the URL Matcher would use `SomeGetModel` for `GET` requests to `http://api.example.com/path`, `SomePutModel` for `PUT` requests, and `SomeModel` for other methods like `POST`, `DELETE`, and etc.

-------------------------------------------------------------------------------