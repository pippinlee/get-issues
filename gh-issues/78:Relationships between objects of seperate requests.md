Relationships between objects of seperate requests
Issue filed by: lvandyk
Mon Nov 16 2015 11:40:27 GMT-0500 (EST)

How do you set relationships in Mantle/Overcoat? This is referring to two separate requests and nothing to do with children in the JSON.

1) I pulled some "Space" objects with a valid MOC and  they were saved to core data.
2) I then pulled some "SpaceTool" objects with a valid MOC and they were saved to core data.

***Question:*** How do I bind the SpaceTools to the Space Object? (One to many).

I saw Mantle has a method which I implemented in the Space Mantle class:

```
@property NSOrderedSet *tools; //.h is NSOrderedSet correct or should I use NSArray?
+ (NSDictionary *)relationshipModelClassesByPropertyKey
{
    return @{ @"tools": [SpaceTool class] };
}
```

as well as in the SpaceTool Mantle class:

```
@property Space* space; // .h
+ (NSDictionary *)relationshipModelClassesByPropertyKey
{
    return @{@"space": [Space class]};
}
```
-------------------------------------------------------------------------------