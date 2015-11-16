Network GET call messes up Core Data persistence
Issue filed by: startupthekid
Mon Nov 16 2015 11:40:27 GMT-0500 (EST)

First off, I love Overcoat. Easily one of the best libraries I've used in a while. I'm just having a small issue with the persistence aspect of Mantle/Overcoat. When I make a call to my backend, I first do a Core Data fetch and then execute the network request. On the first try, the core data fetch returns the correct number of objects but once the network call completes, the results returned by subsequent core data fetches always total to 0.

    let fetch = self.fetchRequestForGroup(group)
        var error: NSError?
        let context = CoreDataManager.sharedManager().managedObjectContext
        if let results = context.executeFetchRequest(fetch, error: &error) as? [NSManagedObject] {
            self.mapResults(results, toModelClass: Post.self, withBlock: {
                (mapped, errors) in
                if error == nil {
                    block?(mapped, error)
                } else {
                    block?([], error)
                }
            })
        }
        let URI = Types.RequestPath.Post.rawValue
        NetworkManager.singleton.GET(URI, parameters: ["groupID": groupID], completion: {
            if $1 == nil {
                self.removeDuplicates($0.result as [Post])
                block?($0.result as [Post], $1)
            } else {
                block?([], $1)
            }
        })

    // MARK: - Fetch Request
    
    class func fetchRequestForGroup(group: Group) -> NSFetchRequest {
        let context = CoreDataManager.sharedManager().managedObjectContext
        let fetch: NSFetchRequest = NSFetchRequest(entityName: NSStringFromClass(Post.self))
        fetch.entity = NSEntityDescription.entityForName("Post", inManagedObjectContext:context)
        fetch.predicate = NSPredicate(format: "ANY SELF.%K = %@", "group.groupID", group.groupID)
        fetch.sortDescriptors = [NSSortDescriptor(key: "timestamp", ascending: true)]
        return fetch
    }
    
    // MARK: - Duplicates
    class func removeDuplicates(posts: [Post]) {
        let identifiers = posts.map({($0 as Post).postID as String})
        let fetch = NSFetchRequest(entityName: NSStringFromClass(Post.self))
        fetch.entity = NSEntityDescription.entityForName("Post", inManagedObjectContext:CoreDataManager.sharedManager().managedObjectContext)
        fetch.predicate = NSPredicate(format: "NOT (postID IN %@)", identifiers)
        var error: NSError?
        if let results = CoreDataManager.sharedManager().managedObjectContext.executeFetchRequest(fetch, error: &error) {
            for result in results as [NSManagedObject] {
                CoreDataManager.sharedManager().managedObjectContext.deleteObject(result)
            }
        }
    }

    // MARK: - Mapping Managed Objects to Swift Classes
    
    class func mapResults<T: MTLModel where T: MTLManagedObjectSerializing>(results: [NSManagedObject], toModelClass modelClass: T.Type, withBlock block: ([T], [NSError?]) -> Void) {
            var transformed: [T] = []
            var errors: [NSError?] = []
            for result in results {
                var error: NSError? = nil
                var model: T = MTLManagedObjectAdapter.modelOfClass(modelClass, fromManagedObject: result, error: &error) as T
                transformed.append(model)
                if error != nil {
                    errors.append(error)
                }
            }
            block(transformed, errors)

    }

As you can see I first generate a fetch request to find all `Post` objects whose `Group` relationship object has the same identifier as the one I'm passing in. Then I execute the request, get the corresponding `NSManagedObject` instances then use `mapResults` to map the `NSManagedObject` instances to my own model classes, which are subclasses of `MTLModel`. Those persistent objects are then passed in through the callback and the `NetworkManager.singleton` executes a GET request (`NetworkManager` is a subclass of `OVCHTTPSessionManager`). Once the network call returns, I remove any duplicate objects and return the results. It's after this point that calling `retrievePostsForGroup` returns 0 objects from the core data fetch. If I remove the call to my backend, then the correct amount of objects are always returned. Additionally, I'm the only one using the app since I'm in development right now and the objects returned from the backend exactly match the ones in the core data store, same identifiers and everything. Is there something I'm missing with Overcoat or is the issue more likely to be in my backend server and the response its returning? I would assume that once the network call completes, the objects returned would be automatically persisted but that doesn't seem to be the case.
-------------------------------------------------------------------------------