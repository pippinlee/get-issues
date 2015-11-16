Support errorModelClass for HTTP 2XX.
Issue filed by: dkpalmer
Mon Nov 16 2015 11:40:27 GMT-0500 (EST)

I'm working with some web services that are setup to keep HTTP response codes limited to transport and leave the client response as part of the body.  As such, I may get an HTTP 200 but with an error model.  I'm not sure the best place to inject such support.  Perhaps in OVCModelResponseSerializer in the event there's an error OR a serializationError?
-------------------------------------------------------------------------------
gonzalezreal
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

For that case my recommendation is to subclass `OVCResponse` and handle the error there.

-------------------------------------------------------------------------------
gonzalezreal
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

Hi @yuzaken. Which HTTP status codes is your service returning on error?

-------------------------------------------------------------------------------
yuzaken
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

I believe I am having a similar issue.  My response JSON for errors has a different path than that of a successful response.  I cannot figure out how to get Overcoat to use my Error class.  Its like I need to register another ServerResponse class for error responses.

SPCAPIError is a subclass of OVCResponse.
@interface SPCAPIError : OVCResponse
@property (nonatomic, strong, readonly) NSNumber * code;
@property (nonatomic, copy, readonly) NSString * message;
@property (nonatomic, copy, readonly) NSString * title;
@property (nonatomic, copy, readonly) NSString * recoverySuggestion;
@end

// I have set this up.
    + (Class) errorModelClass {
              return [SPCAPIError class];
    }

JSON Returned from our API:

On Error:

    error =     {
        code = 403;
        message = "Missing access token in request";
        recoverySuggestion = "Try the request again";
        title = Forbidden;
    };

On Success:

     response: {
           .....
    };


-------------------------------------------------------------------------------
yuzaken
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

In this example, 403, along with the JSON content outlined above.  To be precise:

HTTP/1.0 403 Forbidden
Cache-Control: private, must-revalidate
Date:          Tue, 04 Nov 2014 21:35:03 GMT
Etag:          2df56cb2d44c371a3b69b1b88671e9f1
X-Api-Version: application/vnd.snapcam+json; version=1

{"error":{"code":403,"title":"Forbidden","message":"The selected email is invalid.","recoverySuggestion":"Try the request again"}}


The raw details of the response looks like (Apologies for the lack of formatting)... :)

Error Domain=com.alamofire.error.serialization.response Code=-1011 "Request failed: forbidden (403)" UserInfo=0x7f9c83c3a100 {NSLocalizedDescription=Request failed: forbidden (403), NSUnderlyingError=0x7f9c83c636d0 "Request failed: unacceptable content-type: text/html", NSErrorFailingURLKey=https://staging-app.snapc.am/user/auth, OVCResponse=<OVCResponse: 0x7f9c83c5b9d0> {
    HTTPResponse = "<NSHTTPURLResponse: 0x7f9c84148010> { URL: https://staging-app.snapc.am/user/auth } { status code: 403, headers {\n    \"Cache-Control\" = \"private, must-revalidate\";\n    \"Content-Encoding\" = gzip;\n    \"Content-Type\" = \"text/html; charset=utf-8\";\n    Date = \"Tue, 04 Nov 2014 21:36:05 GMT\";\n    Etag = 2df56cb2d44c371a3b69b1b88671e9f1;\n    Server = nginx;\n    \"Strict-Transport-Security\" = \"max-age=31536000; includeSubDomains\";\n    \"x-api-version\" = \"application/vnd.snapcam+json; version=1\";\n    \"x-request-id\" = \"2274-1415136965.114-553-65.34.95.86\";\n} }";
    result = "<null>";
}, com.alamofire.serialization.response.error.data=<7b226572 726f7222 3a7b2263 6f646522 3a343033 2c227469 746c6522 3a22466f 72626964 64656e22 2c226d65 73736167 65223a22 54686520 73656c65 63746564 20656d61 696c2069 7320696e 76616c69 642e222c 22726563 6f766572 79537567 67657374 696f6e22 3a225472 79207468 65207265 71756573 74206167 61696e22 7d7d>, com.alamofire.serialization.response.error.response=<NSHTTPURLResponse: 0x7f9c84148010> { URL: https://staging-app.snapc.am/user/auth } { status code: 403, headers {
    "Cache-Control" = "private, must-revalidate";
    "Content-Encoding" = gzip;
    "Content-Type" = "text/html; charset=utf-8";
    Date = "Tue, 04 Nov 2014 21:36:05 GMT";
    Etag = 2df56cb2d44c371a3b69b1b88671e9f1;
    Server = nginx;
    "Strict-Transport-Security" = "max-age=31536000; includeSubDomains";
    "x-api-version" = "application/vnd.snapcam+json; version=1";
    "x-request-id" = "2274-1415136965.114-553-65.34.95.86";
} }}


-------------------------------------------------------------------------------
gonzalezreal
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

Then you could create a model for your error response, with the **right** mappings for the expected JSON:
```objc
@interface SPCAPIError : MTLModel<MTLJSONSerializing>

@property (copy, nonatomic, readonly) NSNumber *code;
@property (copy, nonatomic, readonly) NSString *message;
@property (copy, nonatomic, readonly) NSString *title;
@property (copy, nonatomic, readonly) NSString *recoverySuggestion;

@end

+ (NSDictionary *)JSONKeyPathsByPropertyKey {
    return @{
               @"code": @"error.code",
               @"message": @"error.message",
               @"title": @"error.title",
               @"recoverySuggestion": @"error.recoverySuggestion"
    };
}
```

And set it up in your client subclass by overriding `+errorModelClass`:

```objc
+ (Class)errorModelClass {
    return [SPCAPIError class];
}
```

Let me know if that works for you.

-------------------------------------------------------------------------------
yuzaken
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

I have done as you described.  But the problem I am seeing is that:

OVCModelResponseSerializer.m:74 -
 `id JSONObject = [super responseObjectForResponse:response data:data error:&serializationError];`
 returns nil JSONObject with an error - Therefore..

OVCModelResponseSerializer.m:101 pass in a nil JSONObject into:    
`OVCResponse *responseObject = [responseClass responseWithHTTPResponse:HTTPResponse
                                                               JSONObject:JSONObject
                                                              resultClass:resultClass];`

So there is no way for the error response can work with a nil JSONObject as far as I can see.

-------------------------------------------------------------------------------
chakming
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

@yuzaken I got the same issue when trying the example(TwitterTimeline) too. 
When the rate limit exceeded, it made the app crash and seems related to OVCModelResponseSerializer.m:74

Error Log here: https://gist.github.com/chakming/6e962ec1450bbd52efdc

-------------------------------------------------------------------------------