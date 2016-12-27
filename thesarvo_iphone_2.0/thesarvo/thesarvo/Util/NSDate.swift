//
//  NSDate.swift
//  AsdeqForms
//
//  Created by Jon on 24/11/2014.
//  Copyright (c) 2014 Asdeq Labs Pty Ptd. All rights reserved.
//

//
//  AF+Date+Extension.swift
//
//  Version 1.07
//
//  Created by Melvin Rivera on 7/15/14.
//  Copyright (c) 2014. All rights reserved.
//

import Foundation

enum DateFormat {
    case iso8601, dotNet, rss, altRSS
    case custom(String)
}

typealias Date = Foundation.Date

extension Foundation.Date {
    
    // MARK: Intervals In Seconds
    fileprivate static func minuteInSeconds() -> Double { return 60 }
    fileprivate static func hourInSeconds() -> Double { return 3600 }
    fileprivate static func dayInSeconds() -> Double { return 86400 }
    fileprivate static func weekInSeconds() -> Double { return 604800 }
    fileprivate static func yearInSeconds() -> Double { return 31556926 }
    
    // MARK: Components
    fileprivate static func componentFlags() -> NSCalendar.Unit {
        let a: NSCalendar.Unit = [NSCalendar.Unit.NSYearCalendarUnit, NSCalendar.Unit.NSMonthCalendarUnit, NSCalendar.Unit.NSDayCalendarUnit, NSCalendar.Unit.NSWeekCalendarUnit, NSCalendar.Unit.NSHourCalendarUnit]
        let b = a.union(NSCalendar.Unit.NSMinuteCalendarUnit).union(NSCalendar.Unit.NSSecondCalendarUnit).union(NSCalendar.Unit.NSWeekdayCalendarUnit).union(NSCalendar.Unit.NSWeekdayOrdinalCalendarUnit).union(NSCalendar.Unit.weekOfYear)
        return b
    }
    
    fileprivate static func components(fromDate: Foundation.Date) -> DateComponents! {
        return (Calendar.current as NSCalendar).components(Foundation.Date.componentFlags(), from: fromDate)
    }
    
    fileprivate func components() -> DateComponents  {
        return Foundation.Date.components(fromDate: self)!
    }
    
    // MARK: Date From String
    
    init(fromString string: String, format:DateFormat)
    {
        if string.isEmpty {
            (self as NSDate).init()
            return
        }
        
        let string = string as NSString
        
        switch format {
            
        case .dotNet:
            
            // Expects "/Date(1268123281843)/"
            let startIndex = string.range(of: "(").location + 1
            let endIndex = string.range(of: ")").location
            let range = NSRange(location: startIndex, length: endIndex-startIndex)
            let milliseconds = (string.substring(with: range) as NSString).longLongValue
            let interval = TimeInterval(milliseconds / 1000)
            (self as NSDate).init(timeIntervalSince1970: interval)
            
        case .iso8601:
            
            var s = string
            if string.hasSuffix(" 00:00") {
                s = s.substring(to: s.length-6) + "GMT"
            } else if string.hasSuffix("Z") {
                s = s.substring(to: s.length-1) + "GMT"
            }
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ssZZZ"
            if let date = formatter.date(from: string as String) {
                (self as NSDate).init(timeInterval:0, since:date)
            } else {
                (self as NSDate).init()
            }
            
        case .rss:
            
            var s  = string
            if string.hasSuffix("Z") {
                s = s.substring(to: s.length-1) + "GMT"
            }
            let formatter = DateFormatter()
            formatter.dateFormat = "EEE, d MMM yyyy HH:mm:ss ZZZ"
            if let date = formatter.date(from: string as String) {
                (self as NSDate).init(timeInterval:0, since:date)
            } else {
                (self as NSDate).init()
            }
            
        case .altRSS:
            
            var s  = string
            if string.hasSuffix("Z") {
                s = s.substring(to: s.length-1) + "GMT"
            }
            let formatter = DateFormatter()
            formatter.dateFormat = "d MMM yyyy HH:mm:ss ZZZ"
            if let date = formatter.date(from: string as String) {
                (self as NSDate).init(timeInterval:0, since:date)
            } else {
                (self as NSDate).init()
            }
            
        case .custom(let dateFormat):
            
            let formatter = DateFormatter()
            formatter.dateFormat = dateFormat
            if let date = formatter.date(from: string as String) {
                (self as NSDate).init(timeInterval:0, since:date)
            } else {
                (self as NSDate).init()
            }
        }
    }
    
    
    
    // MARK: Comparing Dates
    
    func isEqualToDateIgnoringTime(_ date: Foundation.Date) -> Bool
    {
        let comp1 = Foundation.Date.components(fromDate: self)
        let comp2 = Foundation.Date.components(fromDate: date)
        return ((comp1!.year == comp2!.year) && (comp1!.month == comp2!.month) && (comp1!.day == comp2!.day))
    }
    
    func isToday() -> Bool
    {
        return self.isEqualToDateIgnoringTime(Foundation.Date())
    }
    
    func isTomorrow() -> Bool
    {
        return self.isEqualToDateIgnoringTime(Foundation.Date().dateByAddingDays(1))
    }
    
    func isYesterday() -> Bool
    {
        return self.isEqualToDateIgnoringTime(Foundation.Date().dateBySubtractingDays(1))
    }
    
    func isSameWeekAsDate(_ date: Foundation.Date) -> Bool
    {
        let comp1 = Foundation.Date.components(fromDate: self)
        let comp2 = Foundation.Date.components(fromDate: date)
        // Must be same week. 12/31 and 1/1 will both be week "1" if they are in the same week
        if comp1?.weekOfYear != comp2?.weekOfYear {
            return false
        }
        // Must have a time interval under 1 week
        return abs(self.timeIntervalSince(date)) < Foundation.Date.weekInSeconds()
    }
    
    func isThisWeek() -> Bool
    {
        return self.isSameWeekAsDate(Foundation.Date())
    }
    
    func isNextWeek() -> Bool
    {
        let interval: TimeInterval = Foundation.Date().timeIntervalSinceReferenceDate + Foundation.Date.weekInSeconds()
        let date = Foundation.Date(timeIntervalSinceReferenceDate: interval)
        return self.isSameYearAsDate(date)
    }
    
    func isLastWeek() -> Bool
    {
        let interval: TimeInterval = Foundation.Date().timeIntervalSinceReferenceDate - Foundation.Date.weekInSeconds()
        let date = Foundation.Date(timeIntervalSinceReferenceDate: interval)
        return self.isSameYearAsDate(date)
    }
    
    func isSameYearAsDate(_ date: Foundation.Date) -> Bool
    {
        let comp1 = Foundation.Date.components(fromDate: self)
        let comp2 = Foundation.Date.components(fromDate: date)
        return (comp1!.year == comp2!.year)
    }
    
    func isThisYear() -> Bool
    {
        return self.isSameYearAsDate(Foundation.Date())
    }
    
    func isNextYear() -> Bool
    {
        let comp1 = Foundation.Date.components(fromDate: self)
        let comp2 = Foundation.Date.components(fromDate: Foundation.Date())
        return (comp1!.year! == comp2!.year! + 1)
    }
    
    func isLastYear() -> Bool
    {
        let comp1 = Foundation.Date.components(fromDate: self)
        let comp2 = Foundation.Date.components(fromDate: Foundation.Date())
        return (comp1!.year! == comp2!.year! - 1)
    }
    
    func isEarlierThanDate(_ date: Foundation.Date) -> Bool
    {
        return (self as NSDate).earlierDate(date) == self
    }
    
    func isLaterThanDate(_ date: Foundation.Date) -> Bool
    {
        return (self as NSDate).laterDate(date) == self
    }
    
    
    // MARK: Adjusting Dates
    
    func dateByAddingDays(_ days: Int) -> Foundation.Date
    {
        let interval: TimeInterval = self.timeIntervalSinceReferenceDate + Foundation.Date.dayInSeconds() * Double(days)
        return Foundation.Date(timeIntervalSinceReferenceDate: interval)
    }
    
    func dateBySubtractingDays(_ days: Int) -> Foundation.Date
    {
        let interval: TimeInterval = self.timeIntervalSinceReferenceDate - Foundation.Date.dayInSeconds() * Double(days)
        return Foundation.Date(timeIntervalSinceReferenceDate: interval)
    }
    
    func dateByAddingHours(_ hours: Int) -> Foundation.Date
    {
        let interval: TimeInterval = self.timeIntervalSinceReferenceDate + Foundation.Date.hourInSeconds() * Double(hours)
        return Foundation.Date(timeIntervalSinceReferenceDate: interval)
    }
    
    func dateBySubtractingHours(_ hours: Int) -> Foundation.Date
    {
        let interval: TimeInterval = self.timeIntervalSinceReferenceDate - Foundation.Date.hourInSeconds() * Double(hours)
        return Foundation.Date(timeIntervalSinceReferenceDate: interval)
    }
    
    func dateByAddingMinutes(_ minutes: Int) -> Foundation.Date
    {
        let interval: TimeInterval = self.timeIntervalSinceReferenceDate + Foundation.Date.minuteInSeconds() * Double(minutes)
        return Foundation.Date(timeIntervalSinceReferenceDate: interval)
    }
    
    func dateBySubtractingMinutes(_ minutes: Int) -> Foundation.Date
    {
        let interval: TimeInterval = self.timeIntervalSinceReferenceDate - Foundation.Date.minuteInSeconds() * Double(minutes)
        return Foundation.Date(timeIntervalSinceReferenceDate: interval)
    }
    
    func dateAtStartOfDay() -> Foundation.Date
    {
        var components = self.components()
        components.hour = 0
        components.minute = 0
        components.second = 0
        return Calendar.current.date(from: components)!
    }
    
    func dateAtEndOfDay() -> Foundation.Date
    {
        var components = self.components()
        components.hour = 23
        components.minute = 59
        components.second = 59
        return Calendar.current.date(from: components)!
    }
    
    func dateAtStartOfWeek() -> Foundation.Date
    {
        let flags :NSCalendar.Unit = [.NSYearCalendarUnit, .NSMonthCalendarUnit, .NSWeekCalendarUnit, .NSWeekdayCalendarUnit]
        var components = (Calendar.current as NSCalendar).components(flags, from: self)
        components.weekday = 1 // Sunday
        components.hour = 0
        components.minute = 0
        components.second = 0
        return Calendar.current.date(from: components)!
    }
    
    func dateAtEndOfWeek() -> Foundation.Date
    {
        let flags :NSCalendar.Unit = [.NSYearCalendarUnit, .NSMonthCalendarUnit, .NSWeekCalendarUnit, .NSWeekdayCalendarUnit]
        var components = (Calendar.current as NSCalendar).components(flags, from: self)
        components.weekday = 7 // Sunday
        components.hour = 0
        components.minute = 0
        components.second = 0
        return Calendar.current.date(from: components)!
    }
    
    
    // MARK: Retrieving Intervals
    
    func minutesAfterDate(_ date: Foundation.Date) -> Int
    {
        let interval = self.timeIntervalSince(date)
        return Int(interval / Foundation.Date.minuteInSeconds())
    }
    
    func minutesBeforeDate(_ date: Foundation.Date) -> Int
    {
        let interval = date.timeIntervalSince(self)
        return Int(interval / Foundation.Date.minuteInSeconds())
    }
    
    func hoursAfterDate(_ date: Foundation.Date) -> Int
    {
        let interval = self.timeIntervalSince(date)
        return Int(interval / Foundation.Date.hourInSeconds())
    }
    
    func hoursBeforeDate(_ date: Foundation.Date) -> Int
    {
        let interval = date.timeIntervalSince(self)
        return Int(interval / Foundation.Date.hourInSeconds())
    }
    
    func daysAfterDate(_ date: Foundation.Date) -> Int
    {
        let interval = self.timeIntervalSince(date)
        return Int(interval / Foundation.Date.dayInSeconds())
    }
    
    func daysBeforeDate(_ date: Foundation.Date) -> Int
    {
        let interval = date.timeIntervalSince(self)
        return Int(interval / Foundation.Date.dayInSeconds())
    }
    
    
    // MARK: Decomposing Dates
    
    func nearestHour () -> Int {
        let halfHour = Foundation.Date.minuteInSeconds() * 30
        var interval = self.timeIntervalSinceReferenceDate
        if  self.seconds() < 30 {
            interval -= halfHour
        } else {
            interval += halfHour
        }
        let date = Foundation.Date(timeIntervalSinceReferenceDate: interval)
        return date.hour()
    }
    
    func year () -> Int { return self.components().year!  }
    func month () -> Int { return self.components().month! }
    func week () -> Int { return self.components().weekOfYear! }
    func day () -> Int { return self.components().day! }
    func hour () -> Int { return self.components().hour! }
    func minute () -> Int { return self.components().minute! }
    func seconds () -> Int { return self.components().second! }
    func weekday () -> Int { return self.components().weekday! }
    func nthWeekday () -> Int { return self.components().weekdayOrdinal! } //// e.g. 2nd Tuesday of the month is 2
    func monthDays () -> Int { return (Calendar.current as NSCalendar).range(of: .NSDayCalendarUnit, in: .NSMonthCalendarUnit, for: self).length }
    func firstDayOfWeek () -> Int {
        let distanceToStartOfWeek = Foundation.Date.dayInSeconds() * Double(self.components().weekday! - 1)
        let interval: TimeInterval = self.timeIntervalSinceReferenceDate - distanceToStartOfWeek
        return Foundation.Date(timeIntervalSinceReferenceDate: interval).day()
    }
    func lastDayOfWeek () -> Int {
        let distanceToStartOfWeek = Foundation.Date.dayInSeconds() * Double(self.components().weekday! - 1)
        let distanceToEndOfWeek = Foundation.Date.dayInSeconds() * Double(7)
        let interval: TimeInterval = self.timeIntervalSinceReferenceDate - distanceToStartOfWeek + distanceToEndOfWeek
        return Foundation.Date(timeIntervalSinceReferenceDate: interval).day()
    }
    func isWeekday() -> Bool {
        return !self.isWeekend()
    }
    func isWeekend() -> Bool {
        let range = (Calendar.current as NSCalendar).maximumRange(of: .NSWeekdayCalendarUnit)
        return (self.weekday() == range.location || self.weekday() == range.length)
    }
    
    
    // MARK: To String
    
    func toString() -> String {
        return self.toString(dateStyle: .short, timeStyle: .short, doesRelativeDateFormatting: false)
    }
    
    func toString(format: DateFormat) -> String
    {
        var dateFormat: String
        switch format {
        case .dotNet:
            let offset = NSTimeZone.default.secondsFromGMT() / 3600
            let nowMillis = 1000 * self.timeIntervalSince1970
            return  "/Date(\(nowMillis)\(offset))/"
        case .iso8601:
            dateFormat = "yyyy-MM-dd'T'HH:mm:ssZ"
        case .rss:
            dateFormat = "EEE, d MMM yyyy HH:mm:ss ZZZ"
        case .altRSS:
            dateFormat = "d MMM yyyy HH:mm:ss ZZZ"
        case .custom(let string):
            dateFormat = string
        }
        let formatter = DateFormatter()
        formatter.dateFormat = dateFormat
        return formatter.string(from: self)
    }
    
    func toString(dateStyle: DateFormatter.Style, timeStyle: DateFormatter.Style, doesRelativeDateFormatting: Bool = false) -> String
    {
        let formatter = DateFormatter()
        formatter.dateStyle = dateStyle
        formatter.timeStyle = timeStyle
        formatter.doesRelativeDateFormatting = doesRelativeDateFormatting
        return formatter.string(from: self)
    }
    
    func relativeTimeToString() -> String
    {
        let time = self.timeIntervalSince1970
        let now = Foundation.Date().timeIntervalSince1970
        
        let seconds = Int( now - time )
        let minutes = seconds/60
        let hours = minutes/60
        let days = hours/24
        
        if seconds < 10 {
            return NSLocalizedString("just now", comment: "relative time")
        } else if seconds < 60 {
            return NSLocalizedString("\(seconds) seconds ago", comment: "relative time")
        }
        
        if minutes < 60 {
            if minutes == 1 {
                return NSLocalizedString("1 minute ago", comment: "relative time")
            } else {
                return NSLocalizedString("\(minutes) minutes ago", comment: "relative time")
            }
        }
        
        if hours < 24 {
            if hours == 1 {
                return NSLocalizedString("1 hour ago", comment: "relative time")
            } else {
                return NSLocalizedString("\(hours) hours ago", comment: "relative time")
            }
        }
        
        if days < 7 {
            if days == 1 {
                return NSLocalizedString("1 day ago", comment: "relative time")
            } else {
                return NSLocalizedString("\(days) days ago", comment: "relative time")
            }
        }
        
        return self.toString()
    }
    
    
    func weekdayToString() -> String {
        let formatter = DateFormatter()
        return formatter.weekdaySymbols[self.weekday()-1] as String
    }
    
    func shortWeekdayToString() -> String {
        let formatter = DateFormatter()
        return formatter.shortWeekdaySymbols[self.weekday()-1] as String
    }
    
    func veryShortWeekdayToString() -> String {
        let formatter = DateFormatter()
        return formatter.veryShortWeekdaySymbols[self.weekday()-1] as String
    }
    
    func monthToString() -> String {
        let formatter = DateFormatter()
        return formatter.monthSymbols[self.month()-1] as String
    }
    
    func shortMonthToString() -> String {
        let formatter = DateFormatter()
        return formatter.shortMonthSymbols[self.month()-1] as String
    }
    
    func veryShortMonthToString() -> String {
        let formatter = DateFormatter()
        return formatter.veryShortMonthSymbols[self.month()-1] as String
    }
    
    
    
}
