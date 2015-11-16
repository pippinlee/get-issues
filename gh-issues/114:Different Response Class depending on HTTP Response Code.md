Different Response Class depending on HTTP Response Code
Issue filed by: lvandyk
Mon Nov 16 2015 11:40:27 GMT-0500 (EST)

Is it possible to map class X to 200 and class Y to 202 for the same resource path?

My scenario: /login either returns 200 with ouath token details or 202 with one time pin details.
-------------------------------------------------------------------------------
sodastsai
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

Hi, we're also discussing about adding new features to the URL matcher.

I've proposed one in https://github.com/Overcoat/Overcoat/issues/64#issuecomment-154342881 which is used to return different classes by HTTP methods. Would it be okay that using similar way for HTTP status code?

-------------------------------------------------------------------------------
sodastsai
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

Like:

```objective-c
+ (NSDictionary *)modelClassesByResourcePath {
    return @{
        @"model": [OVCTestModel class],
        @"path": [OVCURLMatcherNode nodeWithClassesByHTTPStatusCodes:@{
            @"*": [SomeModel class],
            @"204": [Some200Model class],
            @"201": [Some201Model class],
        }],
    };
}
```

-------------------------------------------------------------------------------
lvandyk
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

This would be amazing! +1

-------------------------------------------------------------------------------