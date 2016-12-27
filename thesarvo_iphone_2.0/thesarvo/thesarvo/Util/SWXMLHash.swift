//
//  SWXMLHash.swift
//
//  Copyright (c) 2014 David Mohundro
//
//  Permission is hereby granted, free of charge, to any person obtaining a copy
//  of this software and associated documentation files (the "Software"), to deal
//  in the Software without restriction, including without limitation the rights
//  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
//  copies of the Software, and to permit persons to whom the Software is
//  furnished to do so, subject to the following conditions:
//
//  The above copyright notice and this permission notice shall be included in
//  all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
//  THE SOFTWARE.

import Foundation

/// Simple XML parser.
open class SWXMLHash {
    /**
    Method to parse XML passed in as a string.
    
    - parameter xml: The XML to be parsed
    
    - returns: An XMLIndexer instance that is used to look up elements in the XML
    */
    class open func parse(_ xml: String) -> XMLIndexer {
        return parse((xml as NSString).data(using: String.Encoding.utf8.rawValue)!)
    }
    
    /**
    Method to parse XML passed in as an NSData instance.
    
    - parameter xml: The XML to be parsed
    
    - returns: An XMLIndexer instance that is used to look up elements in the XML
    */
    class open func parse(_ data: Data) -> XMLIndexer {
        let parser = XMLParser()
        return parser.parse(data)
    }
}

/// The implementation of NSXMLParserDelegate and where the parsing actually happens.
class XMLParser : NSObject, XMLParserDelegate {
    var parsingElement: String = ""
    
    override init() {
        currentNode = root
        super.init()
    }
    
    var lastResults: String = ""
    
    var root = XMLElement(name: "root")
    var currentNode: XMLElement
    var parentStack = [XMLElement]()
    
    func parse(_ data: Data) -> XMLIndexer {
        // clear any prior runs of parse... expected that this won't be necessary, but you never know
        parentStack.removeAll(keepingCapacity: false)
        root = XMLElement(name: "root")
        
        parentStack.append(root)
        
        let parser = Foundation.XMLParser(data: data)
        parser.delegate = self
        parser.parse()
        
        return XMLIndexer(root)
    }
    
    func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?, qualifiedName qName: String?, attributes attributeDict: [String : String])
    {
        
        self.parsingElement = elementName
        
        currentNode = parentStack[parentStack.count - 1].addElement(elementName, withAttributes: attributeDict as NSDictionary)
        parentStack.append(currentNode)
        
        lastResults = ""
    }
    
    func parser(_ parser: XMLParser, foundCharacters string: String) {
        if parsingElement == currentNode.name {
            lastResults += string.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
        }
    }
    
    func parser(_ parser: XMLParser, didEndElement elementName: String, namespaceURI: String?, qualifiedName qName: String?) {
        parsingElement = elementName
        
        if !lastResults.isEmpty {
            currentNode.text = lastResults
        }
        
        parentStack.removeLast()
    }
}

/// Returned from SWXMLHash, allows easy element lookup into XML data.
public enum XMLIndexer : Sequence {
    case Element(XMLElement)
    case list([XMLElement])
    case error(NSError)
    
    /// The underlying XMLElement at the currently indexed level of XML.
    public var element: XMLElement? {
        get {
            switch self {
            case .Element(let elem):
                return elem
            default:
                return nil
            }
        }
    }
    
    /// The underlying array of XMLElements at the currently indexed level of XML.
    public var all: [XMLIndexer] {
        get {
            switch self {
            case .list(let list):
                var xmlList = [XMLIndexer]()
                for elem in list {
                    xmlList.append(XMLIndexer(elem))
                }
                return xmlList
            case .Element(let elem):
                return [XMLIndexer(elem)]
            default:
                return []
            }
        }
    }
    
    /**
    Allows for element lookup by matching attribute values.
    
    - parameter attr: should the name of the attribute to match on
    - parameter _: should be the value of the attribute to match on
    
    - returns: instance of XMLIndexer
    */
    public func withAttr(_ attr: String, _ value: String) -> XMLIndexer {
        let attrUserInfo = [NSLocalizedDescriptionKey: "XML Attribute Error: Missing attribute [\"\(attr)\"]"]
        let valueUserInfo = [NSLocalizedDescriptionKey: "XML Attribute Error: Missing attribute [\"\(attr)\"] with value [\"\(value)\"]"]
        switch self {
        case .list(let list):
            if let elem = list.filter({$0.attributes[attr] == value}).first {
                return .Element(elem)
            }
            return .error(NSError(domain: "SWXMLDomain", code: 1000, userInfo: valueUserInfo))
        case .Element(let elem):
            if let attr = elem.attributes[attr] {
                if attr == value {
                    return .Element(elem)
                }
                return .error(NSError(domain: "SWXMLDomain", code: 1000, userInfo: valueUserInfo))
            }
            return .error(NSError(domain: "SWXMLDomain", code: 1000, userInfo: attrUserInfo))
        default:
            return .error(NSError(domain: "SWXMLDomain", code: 1000, userInfo: attrUserInfo))
        }
    }
    
    /**
    Initializes the XMLIndexer
    
    - parameter _: should be an instance of XMLElement, but supports other values for error handling
    
    - returns: instance of XMLIndexer
    */
    public init(_ rawObject: AnyObject) {
        switch rawObject {
        case let value as XMLElement:
            self = .Element(value)
        default:
            self = .error(NSError(domain: "SWXMLDomain", code: 1000, userInfo: nil))
        }
    }
    
    /**
    Find an XML element at the current level by element name
    
    - parameter key: The element name to index by
    
    - returns: instance of XMLIndexer to match the element (or elements) found by key
    */
    public subscript(key: String) -> XMLIndexer {
        get {
            let userInfo = [NSLocalizedDescriptionKey: "XML Element Error: Incorrect key [\"\(key)\"]"]
            switch self {
            case .Element(let elem):
                if let match = elem.elements[key] {
                    if match.count == 1 {
                        return .Element(match[0])
                    }
                    else {
                        return .list(match)
                    }
                }
                return .error(NSError(domain: "SWXMLDomain", code: 1000, userInfo: userInfo))
            default:
                return .error(NSError(domain: "SWXMLDomain", code: 1000, userInfo: userInfo))
            }
        }
    }
    
    /**
    Find an XML element by index within a list of XML Elements at the current level
    
    - parameter index: The 0-based index to index by
    
    - returns: instance of XMLIndexer to match the element (or elements) found by key
    */
    public subscript(index: Int) -> XMLIndexer {
        get {
            let userInfo = [NSLocalizedDescriptionKey: "XML Element Error: Incorrect index [\"\(index)\"]"]
            switch self {
            case .list(let list):
                if index <= list.count {
                    return .Element(list[index])
                }
                return .error(NSError(domain: "SWXMLDomain", code: 1000, userInfo: userInfo))
            case .Element(let elem):
                if index == 0 {
                    return .Element(elem)
                }
                else {
                    return .error(NSError(domain: "SWXMLDomain", code: 1000, userInfo: userInfo))
                }
            default:
                return .error(NSError(domain: "SWXMLDomain", code: 1000, userInfo: userInfo))
            }
        }
    }
    
    typealias GeneratorType = XMLIndexer
    
    public func makeIterator() -> IndexingIterator<[XMLIndexer]> {
        return all.makeIterator()
    }
}

/// XMLIndexer extensions
extension XMLIndexer {
    /// True if a valid XMLIndexer, false if an error type
    public var boolValue: Bool {
        get {
            switch self {
            case .error:
                return false
            default:
                return true
            }
        }
    }
}

/// Models an XML element, including name, text and attributes
open class XMLElement {
    /// The name of the element
    open let name: String
    /// The inner text of the element, if it exists
    open var text: String?
    /// The attributes of the element
    open var attributes = [String:String]()
    
    var elements = [String:[XMLElement]]()
    
    /**
    Initialize an XMLElement instance
    
    - parameter name: The name of the element to be initialized
    
    - returns: a new instance of XMLElement
    */
    init(name: String) {
        self.name = name
    }
    
    /**
    Adds a new XMLElement underneath this instance of XMLElement
    
    - parameter name: The name of the new element to be added
    - parameter withAttributes: The attributes dictionary for the element being added
    
    - returns: The XMLElement that has now been added
    */
    func addElement(_ name: String, withAttributes attributes: NSDictionary) -> XMLElement {
        let element = XMLElement(name: name)
        
        if var group = elements[name] {
            group.append(element)
            elements[name] = group
        }
        else {
            elements[name] = [element]
        }
        
        for (keyAny,valueAny) in attributes {
            let key = keyAny as! String
            let value = valueAny as! String
            element.attributes[key] = value
        }
        
        return element
    }
}
