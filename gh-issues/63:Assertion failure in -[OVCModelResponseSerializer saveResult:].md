Assertion failure in -[OVCModelResponseSerializer saveResult:]
Issue filed by: chewedon
Mon Nov 16 2015 11:40:27 GMT-0500 (EST)

Hi.

I have an app whereby each time I login, I fetch some data (let's call this data "fruit" for now) from my server and Overcoat saves them into Core Data automatically.

However, I am noticing subsequent login, logout, login causes the save  "fruit" to have a conflict resulting in a crash. We have integrated Bugsense (now called Splunk Mint) and this is the error we are getting:

> \<OVCModelResponseSerializer: 0x156ae440> saveResult failed with error: Error Domain=NSCocoaErrorDomain Code=133020 "The operation couldn’t be completed. (Cocoa error 133020.)" UserInfo=0x1559e8b0 {conflictList=( "NSMergeConflict (0x16b5c860) for NSManagedObject (0x156c6c40) with objectID '0x156722a0 <x-coredata://81332BC6-247C-4E3C-B781-D5C62CE2A9FE/Post/p8>' with oldVersion = 13 and newVersion = 14 and old object snapshot = {\n fruit = \"0x156227d0 <x-coredata://81332BC6-247C-4E

The error stops on the **line 135 of OVCModelResponseSerializer.m** which is:

    [context save:&error];



Is anyone having this same issue?

This is probably the biggest issue using Overcoat for me. Hopefully there's a fix because I'm out of workarounds at the moment.

Or perhaps there is an Overcoat usage guidelines that I'm not aware of?

Cheers. 

-------------------------------------------------------------------------------
gonzalezreal
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

This looks like a merge conflict due to a Core Data concurrent operation. Can you post the code where you're doing the fetch operation?

-------------------------------------------------------------------------------
chewedon
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

After I login, I init my full tab bar to show all 5 tab bar items.

Within this initFullTabBar() method, I call something like:

    - (void)initFullTabBar
    {

        NSUInteger fruitCount = [[OCDataManager sharedInstance] numberOfItemsForEntityofType:@"Fruit"];

        // ---------------------------------------------------------------------------------------------------------
        // Only fetch fruits when there are none in the database.
        // ---------------------------------------------------------------------------------------------------------
        if(fruitCount == 0)
        {
            [[OCAPIClient sharedInstance] fetchDataOfType:@"fruits" FromParentDataType:@"profile" ExtraQuery:nil];
        }
    }

My fetch method is:

    -(PMKPromise *)fetchDataOfType:(NSString *)dataType FromParentDataType:(NSString *)parentDataType ExtraQuery:(NSString *)extraQuery
    {
        NSString *path = [NSString stringWithFormat:@"%@/%@%@",
                          parentDataType ? parentDataType : @"",
                          dataType ? dataType : @"",
                          extraQuery ? extraQuery : @""];

        // ---------------------------------------------------------------------------------------------------------
        // Note: MyAPIClient here is a singleton of the APIClient to my REST server
        // "self" is my subclass of OVCHTTPSessionManager called OCAPIClient
        // ---------------------------------------------------------------------------------------------------------
        MyAPIClient *manager = [MyAPIClient sharedInstance];
    
        AFOAuthCredential *credential = nil;
    
        credential = [AFOAuthCredential retrieveCredentialWithIdentifier:manager.serviceProviderIdentifier];
    
        if(credential != nil)
        {
            [manager setAuthorizationHeaderWithCredential:[AFOAuthCredential retrieveCredentialWithIdentifier:manager.serviceProviderIdentifier]];
        
            [self setAuthorizationHeaderWithCredential:[AFOAuthCredential retrieveCredentialWithIdentifier:self.serviceProviderIdentifier]];
        }
    
        // ---------------------------------------------------------------------------------------------------------
        // The GET method here is inherited from OVCHTTPSessionManager
        // ---------------------------------------------------------------------------------------------------------
        return [self GET:path parameters:nil].then(^(OVCResponse *response) {
            return response.result;        
        });
    }

I don't recall it executing the fetch results twice in a row considering that I put a breakpoint on the line where it executes the fetch.

Bit odd.

-------------------------------------------------------------------------------
gonzalezreal
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

No idea of what's going on. A full stack trace would be helpful.

-------------------------------------------------------------------------------
JaxGit
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

I went across the same CoreData NSMergeConflict (Cocoa error 133020) error and assertion failure in -[OVCModelResponseSerializer saveResult:]. 

The scenarios are like this: 
1. After I received DTO json response (ex: collection of categories, collection of products due to compromise with server-side), I have to manually add to-many relationships for category/products and [context save:&error] in .then() method. 
2. After I received streamed async json responses (ex: API1 response: shop object; API2 response in .then() : collection of categories), I have to manually add to-many relationships for shop/categories as well. 
3. To initiate ManagedObject Serialization with Overcoat for classes inside DTO json response, I have to add additional wrapper class "MTLDummyXXX" and ManagedObject "DummyXXX" for the DTO structure, with a nil propertyKeysForManagedObjectUniquing. Therefore I have to delete junk data in "DummyXXX" afterwards. 

The cause of the problem is that OVCModelResponseSerializer 's context, which would be passed by serializer's initializer when OVC manager classes setupResponseSerializer, was not setup with the right NSMergePolicyType. 

To fix this, I simply override setupBackgroundContext for OVC manager class to set manager's backgroundContext to NSMergeByPropertyObjectTrumpMergePolicy. 

ex: for subclass of OVCHTTPRequestOperationManager
```
//  XXClient.h
@interface XXClient : OVCHTTPRequestOperationManager
@end

//  XXClient.m
@interface XXClient ()
// CoreData NSMergeConflict (Cocoa error 133020) bug fixing overrider
@property (strong, nonatomic) NSManagedObjectContext *backgroundContext;
@property (strong, nonatomic) id contextObserver;
@end

#pragma mark - CoreData NSMergeConflict (Cocoa error 133020) bug fixing overrider
- (void)setupBackgroundContext {
    if (self.managedObjectContext == nil) {
        return;
    }
    
    if ([self.managedObjectContext concurrencyType] == NSPrivateQueueConcurrencyType) {
        self.backgroundContext = self.managedObjectContext;
        
        // CoreData NSMergeConflict (Cocoa error 133020) bug fixing
        [self.backgroundContext setMergePolicy:NSMergeByPropertyObjectTrumpMergePolicy];
        return;
    }
    
    self.backgroundContext = [[NSManagedObjectContext alloc] initWithConcurrencyType:NSPrivateQueueConcurrencyType];
    [self.backgroundContext setPersistentStoreCoordinator:self.managedObjectContext.persistentStoreCoordinator];
    
    // CoreData NSMergeConflict (Cocoa error 133020) bug fixing
    [self.backgroundContext setMergePolicy:NSMergeByPropertyObjectTrumpMergePolicy];
    
    NSNotificationCenter *notificationCenter = [NSNotificationCenter defaultCenter];
    NSManagedObjectContext *context = self.managedObjectContext;
    
    self.contextObserver = [notificationCenter addObserverForName:NSManagedObjectContextDidSaveNotification
                                                           object:self.backgroundContext
                                                            queue:nil
                                                       usingBlock:^(NSNotification *note) {
                                                           [context performBlock:^{
                                                               [context mergeChangesFromContextDidSaveNotification:note];
                                                           }];
                                                       }];
}
```

-------------------------------------------------------------------------------
sodastsai
Mon Nov 16 2015 11:40:28 GMT-0500 (EST)

@JaxGit could you make your fix a pull request? thanks.

-------------------------------------------------------------------------------