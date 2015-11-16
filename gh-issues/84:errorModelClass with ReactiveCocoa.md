errorModelClass with ReactiveCocoa
Issue filed by: 3-n
Mon Nov 16 2015 11:40:27 GMT-0500 (EST)

I'm currently using Overcoat with ReactiveCocoa, using methods provided by `OVCHTTPSessionManager+ReactiveCocoa.h`. All is dandy, but I'm not sure I know how to use it with provided mechanism of `errorModelClass`. It seems that unless I override reactive `rac_GET:parameters:`, `rac_POST:parameters:` etc. to return some custom NSError, I would have to do something like this each time I handle any error:
```objective-c
    [requestSignal subscribeError:^(NSError *error) {
        OVCResponse *response = error.userInfo[@"OVCResponse"];
        MyApiErrorClass *errorObject = response.result;
        [[[UIAlertView alloc] initWithTitle:@"Title" message:errorObject.message delegate:nil cancelButtonTitle:@"OK" otherButtonTitles:nil] show];
    }];
```
It's not *that* bad, really, and could be abstracted out to DRY, but seems like a rough edge in an otherwise quite clean API. Is there any kind of shortcut I didn't notice? Or is it just like that for Reactive, because the raw response info is stripped from error handle, while with "normal" `GET:parameters:completion:` doesn't do that?
-------------------------------------------------------------------------------