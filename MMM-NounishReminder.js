/* Magic Mirror
 * Module: MMM-NounishReminder
 * Display Nounish events for the week, highlight current events
 */
Module.register("MMM-NounishReminder", {
    // Default module config
    defaults: {
        events: [
            { name: "Noun O'Clock", day: "daily", startTime: "21:00", duration: 0 },
            { name: "NounsGG Weekly Call", day: "Saturday", startTime: "02:00", duration: 60 },
            { name: "Lil Uncut Gems", day: "Tuesday", startTime: "11:15", duration: 60 },
            { name: "Nouncil Call", day: "Thursday", startTime: "21:00", duration: 60 },
            { name: "Lil Happy Hour", day: "Friday", startTime: "04:00", duration: 120 }
        ],
        updateInterval: 60 * 1000, // update every minute
        fadeSpeed: 1000,
        showAllEvents: true, // Set to true to show all events regardless of past/future
        debug: true, // Set to true to log debug info to the console
        eventTimezone: 7, // Timezone offset where events were defined (e.g., 7 for GMT+7)
        showLocalTime: true // Set to true to convert events to local time, false to show in original timezone
    },

    // Start the module
    start: function() {
        Log.info("Starting module: " + this.name);
        this.loaded = true;
        this.timer = null;
        this.events = this.processEvents(this.config.events);
        
        // Debug current day
        if (this.config.debug) {
            const now = new Date();
            Log.info("Current date/time at startup:", now);
            Log.info("Current day:", now.toLocaleString('en-us', {weekday: 'long'}));
            Log.info("Events defined in timezone: GMT+" + this.config.eventTimezone);
            Log.info("Local timezone offset: GMT+" + (-new Date().getTimezoneOffset()/60));
        }
        
        // Force immediate update
        this.updateDom(0);
        
        // Schedule update timer
        this.scheduleUpdate();
    },

    // Process events to adjust for timezone
    processEvents: function(rawEvents) {
        // If we're not converting to local time, return events as is
        if (!this.config.showLocalTime) {
            return rawEvents;
        }

        const processedEvents = [];
        
        for (const event of rawEvents) {
            // Clone the event
            const processedEvent = { ...event };
            
            // Only adjust non-daily events
            if (event.day !== "daily") {
                // Calculate time difference between event timezone and local timezone
                const eventTimezoneOffset = this.config.eventTimezone * 60; // Convert to minutes
                const localTimezoneOffset = -new Date().getTimezoneOffset(); // Local offset in minutes
                const minutesDiff = localTimezoneOffset - eventTimezoneOffset;
                
                // Parse the event time
                const [hours, minutes] = event.startTime.split(":").map(Number);
                
                // Create a date object for the event
                const eventDate = new Date();
                eventDate.setHours(hours, minutes, 0, 0);
                
                // Adjust the time by the difference
                eventDate.setMinutes(eventDate.getMinutes() + minutesDiff);
                
                // Extract the new time
                const newHours = eventDate.getHours();
                const newMinutes = eventDate.getMinutes();
                
                // Format as HH:MM
                processedEvent.startTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
                
                // Check if the day has changed
                const dayDiff = Math.floor(minutesDiff / (24 * 60));
                if (dayDiff !== 0) {
                    // Get the day index
                    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                    const dayIndex = dayNames.indexOf(event.day);
                    
                    // Calculate the new day
                    const newDayIndex = (dayIndex + dayDiff + 7) % 7;
                    processedEvent.day = dayNames[newDayIndex];
                    
                    if (this.config.debug) {
                        Log.info(`Adjusted day for event ${event.name} from ${event.day} to ${processedEvent.day} (diff: ${dayDiff} days)`);
                    }
                }
                
                if (this.config.debug) {
                    Log.info(`Adjusted time for event ${event.name} from ${event.startTime} to ${processedEvent.startTime} (diff: ${minutesDiff} minutes)`);
                }
            }
            
            processedEvents.push(processedEvent);
        }
        
        return processedEvents;
    },

    // Override dom generator
    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = "nounish-reminder";
        
        // Debug output if enabled
        if (this.config.debug) {
            const now = new Date();
            Log.info("Current date/time:", now);
        }
        
        // Module header
        const header = document.createElement("header");
        header.className = "module-header";
        header.innerHTML = "NOUNISH REMINDERS";
        wrapper.appendChild(header);

        // Current datetime
        const now = new Date();
        const currentDay = now.toLocaleString('en-us', {weekday: 'long'});
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        if (this.config.debug) {
            Log.info("Current day:", currentDay);
            Log.info("Current time:", currentHour + ":" + currentMinute);
        }

        // Check if any event is happening now
        const currentEvent = this.getCurrentEvent(currentDay, currentHour, currentMinute);
        
        // If there's a current event, show it prominently
        if (currentEvent) {
            const currentEventDiv = document.createElement("div");
            currentEventDiv.className = "current-event bright large";
            
            const remainingTime = this.getRemainingTime(currentEvent, currentHour, currentMinute);
            
            currentEventDiv.innerHTML = `
                <div class="highlight">ON CALL RIGHT NOW</div>
                <div class="event-name">${currentEvent.name}</div>
                <div class="time-remaining">Ends in ${remainingTime}</div>
            `;
            wrapper.appendChild(currentEventDiv);
        }
        
        // Create upcoming events section
        const eventsTitle = document.createElement("div");
        eventsTitle.className = "events-title";
        eventsTitle.innerHTML = "Upcoming Events";
        wrapper.appendChild(eventsTitle);
        
        const eventsTable = document.createElement("table");
        eventsTable.className = "small";
        
        // Get date information for the week
        const datesByDay = this.getThisWeekDates();
        
        if (this.config.debug) {
            Log.info("Dates by day:", JSON.stringify(datesByDay));
        }
        
        // Get upcoming events
        const upcomingEvents = this.config.showAllEvents ? 
            this.getAllEvents(datesByDay) : 
            this.getUpcomingEvents(datesByDay);
            
        if (this.config.debug) {
            Log.info("Upcoming events:", JSON.stringify(upcomingEvents));
            if (upcomingEvents.length === 0) {
                Log.info("No upcoming events found");
            }
        }
        
        if (upcomingEvents.length === 0) {
            const noEventsRow = document.createElement("tr");
            const noEventsCell = document.createElement("td");
            noEventsCell.colSpan = 3;
            noEventsCell.className = "dimmed";
            noEventsCell.innerHTML = "No upcoming events this week";
            noEventsRow.appendChild(noEventsCell);
            eventsTable.appendChild(noEventsRow);
        } else {
            for (const event of upcomingEvents) {
                const eventRow = document.createElement("tr");
                
                // Highlight today's events
                if (event.day === currentDay && event.isToday) {
                    eventRow.className = "today-event";
                }
                
                // Day column with date
                const dayCell = document.createElement("td");
                dayCell.className = "day";
                
                // Get the date for this day - except for daily events
                let dateStr = "";
                if (event.isDaily) {
                    // No date for daily events
                    dayCell.className = "day daily-event";
                    dayCell.innerHTML = "Daily";
                } else {
                    // Regular event with date
                    const date = datesByDay[event.day];
                    if (date) {
                        // Create a new date object to avoid modifying the original
                        const eventDate = new Date(date);
                        
                        // If this event is considered for next week, add 7 days to the date
                        if (event.isNextWeek) {
                            eventDate.setDate(eventDate.getDate() + 7);
                            if (this.config.debug) {
                                Log.info(`Event ${event.name} is for next week, adjusting date by +7 days`);
                            }
                        }
                        
                        // Format as DD/MM
                        dateStr = `${eventDate.getDate()}/${eventDate.getMonth() + 1}`;
                        
                        if (this.config.debug) {
                            Log.info(`Date for ${event.name} (${event.day}): ${eventDate.toLocaleDateString()}, formatted as: ${dateStr}`);
                        }
                    }
                    
                    // Special color for current day
                    if (event.day === currentDay) {
                        dayCell.className = "day current-day";
                    }
                    
                    dayCell.innerHTML = `${event.day.substring(0, 3)} ${dateStr}`;
                }
                
                eventRow.appendChild(dayCell);
                
                // Event name column
                const nameCell = document.createElement("td");
                nameCell.className = "event-name";
                nameCell.innerHTML = event.name;
                
                // Special emphasis for current day events
                if (event.day === currentDay && !event.isDaily) {
                    eventRow.className = "today-event current-day-event";
                    nameCell.innerHTML = `<span class="highlight">${event.name}</span>`;
                } else if (event.isDaily) {
                    // Special styling for daily events
                    eventRow.className = "daily-event-row";
                    nameCell.innerHTML = `<span class="daily-highlight">${event.name}</span>`;
                }
                
                eventRow.appendChild(nameCell);
                
                // Time column
                const timeCell = document.createElement("td");
                timeCell.className = "event-time";
                
                // Format time for display
                const timeStart = this.formatTime(event.startTime);
                let timeDisplay = timeStart;
                
                if (event.duration) {
                    // Calculate end time
                    const endTimeStr = this.calculateEndTime(event);
                    timeDisplay += ` - ${this.formatTime(endTimeStr)}`;
                }
                
                // Apply special styling for daily events
                if (event.isDaily) {
                    timeCell.className = "event-time daily-time";
                    timeCell.innerHTML = `<span class="daily-highlight">${timeDisplay}</span>`;
                } else {
                    timeCell.innerHTML = timeDisplay;
                }
                
                eventRow.appendChild(timeCell);
                
                eventsTable.appendChild(eventRow);
            }
        }
        
        wrapper.appendChild(eventsTable);
        return wrapper;
    },

    // Get this week's dates for each day
    getThisWeekDates: function() {
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const datesByDay = {};
        
        // Map numeric day to day name
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        
        if (this.config.debug) {
            Log.info("Current date:", now);
            Log.info("Current day (0-6):", currentDay);
        }
        
        // Calculate the dates for each day of the current week
        for (let i = 0; i < 7; i++) {
            const date = new Date(now);
            const diff = i - currentDay;
            date.setDate(date.getDate() + diff);
            
            if (this.config.debug) {
                Log.info(`Date for ${dayNames[i]}: ${date.toLocaleDateString()}`);
            }
            
            datesByDay[dayNames[i]] = date;
        }
        
        return datesByDay;
    },
    
    // Get all events (for debugging or when showAllEvents is true)
    getAllEvents: function(datesByDay) {
        const now = new Date();
        const currentDay = now.toLocaleString('en-us', {weekday: 'long'});
        const currentDayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(currentDay);
        
        if (this.config.debug) {
            Log.info("Getting all events, current day:", currentDay);
        }
        
        // Process all events
        const allEvents = [];
        for (const event of this.events) {
            // Check if this is a daily event
            const isDaily = event.day === "daily";
            
            // For daily events, we don't need to do day matching, they're always shown
            // For regular events, determine if they're today or next week
            let isToday = false;
            let isNextWeek = false;
            
            if (isDaily) {
                // Daily events are treated as happening today
                isToday = true;
            } else {
                const eventDayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(event.day);
                isToday = event.day === currentDay;
                isNextWeek = eventDayIndex < currentDayIndex;
            }
            
            allEvents.push({
                ...event,
                isToday: isToday,
                isNextWeek: isNextWeek,
                isDaily: isDaily
            });
            
            if (this.config.debug) {
                Log.info(`Event ${event.name} (${event.day}): isToday=${isToday}, isNextWeek=${isNextWeek}, isDaily=${isDaily}`);
            }
        }
        
        // Sort events
        return this.sortEvents(allEvents);
    },

    // Get upcoming events (filter out past events)
    getUpcomingEvents: function(datesByDay) {
        const now = new Date();
        const currentDay = now.toLocaleString('en-us', {weekday: 'long'});
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentDayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(currentDay);
        
        if (this.config.debug) {
            Log.info("Current day index:", currentDayIndex);
            Log.info("Current day:", currentDay);
            Log.info("Current time:", currentHour + ":" + currentMinute);
        }
        
        const upcomingEvents = [];
        
        // Process all events
        for (const event of this.events) {
            // Check if this is a daily event
            const isDaily = event.day === "daily";
            
            // For daily events, we don't need to do day matching, they're always shown
            let isUpcoming = isDaily; // Daily events are always upcoming
            let isToday = isDaily;    // Daily events are always treated as today
            let isNextWeek = false;   // Daily events are never next week
            
            if (!isDaily) {
                const eventDayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(event.day);
                const [eventHour, eventMinute] = event.startTime.split(":").map(Number);
                
                if (this.config.debug) {
                    Log.info(`Checking event: ${event.name}, day: ${event.day}, index: ${eventDayIndex}, time: ${eventHour}:${eventMinute}`);
                }
                
                // If the event is today
                if (eventDayIndex === currentDayIndex) {
                    isToday = true;
                    isUpcoming = true; // Always include today's events
                    
                    if (this.config.debug) {
                        Log.info(`${event.name} is today and will be shown`);
                    }
                }
                // If the event is on a future day this week
                else if (eventDayIndex > currentDayIndex) {
                    isUpcoming = true;
                    if (this.config.debug) {
                        Log.info(`${event.name} is upcoming (future day)`);
                    }
                } 
                // If the event is on a past day, treat it as happening next week
                else if (eventDayIndex < currentDayIndex) {
                    isUpcoming = true;
                    isNextWeek = true;
                    if (this.config.debug) {
                        Log.info(`${event.name} is upcoming (next week)`);
                    }
                }
            }
            
            if (isUpcoming) {
                upcomingEvents.push({
                    ...event,
                    isToday: isToday,
                    isNextWeek: isNextWeek,
                    isDaily: isDaily
                });
            }
        }
        
        // Sort events
        return this.sortEvents(upcomingEvents);
    },
    
    // Sort events by day of week and then by time
    sortEvents: function(events) {
        const now = new Date();
        const currentDay = now.toLocaleString('en-us', {weekday: 'long'});
        const currentDayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(currentDay);
        
        if (this.config.debug) {
            Log.info("Sorting events, current day index:", currentDayIndex);
            Log.info("Current day:", currentDay);
        }
        
        return [...events].sort((a, b) => {
            // First, prioritize daily events
            if (a.isDaily && !b.isDaily) return -1; // a is daily, b is not
            if (!a.isDaily && b.isDaily) return 1;  // b is daily, a is not
            
            // If both are daily or neither are daily, continue with normal sorting
            // Next, prioritize current day events
            const aIsToday = a.day === currentDay;
            const bIsToday = b.day === currentDay;
            
            if (aIsToday && !bIsToday) return -1; // a is today, b is not
            if (!aIsToday && bIsToday) return 1;  // b is today, a is not
            
            // If both are today or both are not today, continue with normal sorting
            let aDayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(a.day);
            let bDayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(b.day);
            
            // Adjust indices for events that are flagged as next week
            if (a.isNextWeek) aDayIndex += 7;
            if (b.isNextWeek) bDayIndex += 7;
            
            // If both events are from the same day
            if (aDayIndex === bDayIndex) {
                // Sort by time within the same day
                const [aHour, aMinute] = a.startTime.split(":").map(Number);
                const [bHour, bMinute] = b.startTime.split(":").map(Number);
                const aMinutes = aHour * 60 + aMinute;
                const bMinutes = bHour * 60 + bMinute;
                return aMinutes - bMinutes;
            }
            
            // Otherwise sort by day of week
            return aDayIndex - bDayIndex;
        });
    },

    // Get current event if one is happening now
    getCurrentEvent: function(currentDay, currentHour, currentMinute) {
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        for (const event of this.events) {
            if (event.day !== currentDay && event.day !== "daily") continue;
            
            const [eventHour, eventMinute] = event.startTime.split(":").map(Number);
            const eventStartMinutes = eventHour * 60 + eventMinute;
            const eventEndMinutes = eventStartMinutes + event.duration;
            
            if (currentTimeMinutes >= eventStartMinutes && currentTimeMinutes < eventEndMinutes) {
                return event;
            }
        }
        
        return null;
    },
    
    // Calculate remaining time for current event
    getRemainingTime: function(event, currentHour, currentMinute) {
        const [eventHour, eventMinute] = event.startTime.split(":").map(Number);
        const eventStartMinutes = eventHour * 60 + eventMinute;
        const eventEndMinutes = eventStartMinutes + event.duration;
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        const remainingMinutes = eventEndMinutes - currentTimeMinutes;
        
        if (remainingMinutes >= 60) {
            const hours = Math.floor(remainingMinutes / 60);
            const minutes = remainingMinutes % 60;
            return `${hours}h ${minutes}m`;
        } else {
            return `${remainingMinutes}m`;
        }
    },
    
    // Format time for display
    formatTime: function(timeStr) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        let hourDisplay = hours;
        const ampm = hours >= 12 ? "PM" : "AM";
        
        if (hours > 12) {
            hourDisplay = hours - 12;
        } else if (hours === 0) {
            hourDisplay = 12;
        }
        
        return `${hourDisplay}:${String(minutes).padStart(2, '0')} ${ampm}`;
    },
    
    // Schedule next update
    scheduleUpdate: function() {
        const self = this;
        
        // Cancel existing timer
        if (this.timer) {
            clearTimeout(this.timer);
        }
        
        this.timer = setTimeout(function() {
            self.updateDom(self.config.fadeSpeed);
            self.scheduleUpdate();
        }, this.config.updateInterval);
    },
    
    // Calculate end time of an event
    calculateEndTime: function(event) {
        const [hours, minutes] = event.startTime.split(":").map(Number);
        const endDate = new Date();
        endDate.setHours(hours, minutes + event.duration, 0);
        return `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
    },
    
    // CSS styles for module
    getStyles: function() {
        return [
            "MMM-NounishReminder.css"
        ];
    }
});