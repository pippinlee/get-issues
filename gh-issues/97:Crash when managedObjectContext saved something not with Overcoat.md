Crash when managedObjectContext saved something not with Overcoat
Issue filed by: maimake
Mon Nov 16 2015 11:40:27 GMT-0500 (EST)

Step 1. load something normally with Overcoat

`[backgroundContext save:]` trigger NSManagedObjectContextDidSaveNotification, and then the MainQueue context update via `[managedObjectContext mergeChangesFromContextDidSaveNotification:]` 

It's Ok so far.

Step 2. save something normally without Overcoat

The MainQueue context saved something `[managedObjectContext save:]`

It's Ok so far.

Step 3. `Redo Step 1` and then `[backgroundContext save:]` will crash


I guest the background context did not set `MergePolicy` or merge the changes when the MainQueue context saved.


-------------------------------------------------------------------------------