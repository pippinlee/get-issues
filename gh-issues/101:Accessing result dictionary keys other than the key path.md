Accessing result dictionary keys other than the key path
Issue filed by: engineeringman
Mon Nov 16 2015 11:40:27 GMT-0500 (EST)

Consider the following JSON response:
```
{
    "data":
    {
        "access_token": "12345",
        "expires_in": 86400,
    },
    "meta" :
    {
        "other_important_things_we_need":
        {
        },
        "some_user_messages":
        [
        ]
    }
}
```

In our service response class, we simply write:
```
+ (NSString *)resultKeyPathForJSONDictionary:(NSDictionary *)JSONDictionary
{
    return @"data";
}
```

Which works great for the access token class.  However the other response data (under the key "meta" in this example) appears to be irretrievable.

This could be solved many different ways.  Ideally, Overcoat should be able to handle multiple response classes.  To add to this thought, we should be able specify keys that will have a constant class associated with it, and obviously the class to go along with those keys.

Worst case scenario: you could add an instance property to OVCResponse that would allow us to access the raw deserialized response dictionary.  However this technically defeats the purpose of Overcoat (for keys other than "data"), but we at least don't lose that information.  :)

If this is currently possible (and I missed something), it certainly should be demonstrated on the GitHub page or demo project!
-------------------------------------------------------------------------------
sodastsai
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

I think it would be better to create a corresponding model for this class, like:
```objective-c
@interface SomeResponseModel : MTLModel <MTLJSONSerializing>

@property (nonatomic, strong, readonly) SomeDataModel *data;  // Another MTLModel subclass
@property (nonatomic, strong, readonly) SomeMetaModel *meta;  // Another MTLModel subclass

@end
```

But the idea of adding a way to access raw/original response dictionary would be acceptable. :)

-------------------------------------------------------------------------------
engineeringman
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

That would required a lot of redundancy.  A more viable solution (using a base clase for the meta) would be:

```objectivec
------------------------------ ModelBase.h -------------------------------------
@interface ModelBase : MTLModel <MTLJSONSerializing>

@property (nonatomic, strong, readonly) MyMetaModel *meta;  // The constant model class

@end

---------------------------- SomeResponseModel.h -----------------------------------
@interface SomeResponseModel : ModelBase <MTLJSONSerializing>

@property (nonatomic, strong, readonly) SomeDataModel *data;  // One example of a data object

@end

---------------------------- SomeOtherResponseModel.h -----------------------------------
@interface SomeOtherResponseModel : ModelBase <MTLJSONSerializing>

@property (nonatomic, strong, readonly) SomeOtherDataModel *data;  // Another example of a data object

@end
```

But as you can see, I would literally need twice as many model classes, whether I use a base class for the meta or not.  While it would "work", it wreaks of code smell.

The fact is that while responses almost always have a dynamic response class (which overcoat is really good at), often responses include (optional) static classes that overcoat currently can't handle.

As for the raw dictionary, I definitely think it should be accessible.  The dictionary is already loaded into memory, and it's not like it will be stored alongside the serialized response.  A dev wouldn't hold on to the OVCResponse, rather they would store their model object.  In this case, the OVCResponse (and thus the raw response dictionary) would be discarded by ARC.

Even if the raw dictionary was accidentally saved redundantly in memory, the simple fact that it's possible to lose (or worse, not know about) any response data significantly outweighs any memory optimization concerns, in my opinion.

-------------------------------------------------------------------------------
sodastsai
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

I think if both the keys in the response are important, or are the main components of this request, it's worth to have a class which bundles them together.

Like:
```json
{
    "course": {
        "name": "Principles of Operating Systems",
        "lecturer": {
            "name": "Peter"
        }
    },
    "classroom": {
        "name": "CS103",
        "location": {
            "building": "CS Dept.",
            "room": "103"
        }
    }
}
```
In this case, I think both `course` and `classroom` are main components and since they come from the same endpoint of a REST API, it's okay to have them bundled with a wrapper model class.

---

In another case, like this
```json
{
    "books": [
        {
            "name": "Principles of Operating Systems"
        },
        {
            "name": "Introduction to Algorithms"
        }
    ],
    "meta": {
        "prev_page": null,
        "next_page": "SOME_URL_TO_NEXT_PAGE",
        "length": 20,
        "limit": 2,
        "offset": 0
    }
}
```
Yes, it would be redundant to have another model class for this `meta` field. Even the `meta` field is not something we really care about. (like when saving the `books` list as an offline cache)

For this usage, actually you could just subclass `OVCResponse` to make it hold these data for you.
You could reference following code lines:
* [`OVCTestResponse.h`](https://github.com/Overcoat/Overcoat/blob/master/tests/OVCTestResponse.h)
* [`-[OVCResponseTests testCustomResponseClass]`](https://github.com/Overcoat/Overcoat/blob/master/tests/OVCResponseTests.m#L116)
* [`+[OVCHTTPManager responseClass]`](https://github.com/Overcoat/Overcoat/blob/master/sources/Core/OVCHTTPManager.h#L40) or [`+[OVCHTTPManager responseClassesByResourcePath]`](https://github.com/Overcoat/Overcoat/blob/master/sources/Core/OVCHTTPManager.h#L82)

-------------------------------------------------------------------------------