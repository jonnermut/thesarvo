//
// XMLReader.h
//
#import <Foundation/Foundation.h>

@interface XMLReader : NSObject
{
    NSMutableArray *dictionaryStack;
    NSMutableString *textInProgress;
    //NSError **errorPointer;
}

+ (NSDictionary *)dictionaryForXMLData:(NSData *)data ;
+ (NSDictionary *)dictionaryForXMLString:(NSString *)string;

@end