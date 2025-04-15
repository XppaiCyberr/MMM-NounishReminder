# MMM-NounishReminder

A MagicMirror² module that displays reminders for various Nouns community events.

## Installation

1. Navigate to your MagicMirror modules directory:
```bash
cd ~/MagicMirror/modules
```

2. Clone this repository:
```bash
git clone https://github.com/xppaicyberr/MMM-NounishReminder.git
```

3. Configure the module in your `config.js` file.

## Configuration

Add the following to your `config.js` file:

```javascript
{
    module: "MMM-NounishReminder",
    position: "top_center", // or any other position
    config: {
        // Optional: customize default events
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
        debug: false, // Set to true to log debug info to the console
        eventTimezone: 7, // Timezone offset where events were defined (e.g., 7 for GMT+7)
        showLocalTime: true // Set to true to convert events to local time, false to show in original timezone
    }
}
```

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `events` | Array of event objects | See below |
| `updateInterval` | How often to update the display (in milliseconds) | `60000` (1 minute) |
| `fadeSpeed` | Speed of the fade animation when updating (in milliseconds) | `1000` |
| `showAllEvents` | Show all events for the week or only upcoming events | `true` |
| `debug` | Enable debug logging to the console | `true` |
| `eventTimezone` | Timezone offset where events were defined (hours from GMT) | `7` (GMT+7) |
| `showLocalTime` | Convert events to local time or show in original timezone | `true` |

## Event Configuration

Each event requires the following properties:

| Property | Description | Example |
|----------|-------------|---------|
| `name` | Name of the event | `"NounsGG Weekly Call"` |
| `day` | Day of the week, or "daily" for daily events | `"Saturday"` or `"daily"` |
| `startTime` | Start time in 24-hour format | `"14:30"` |
| `duration` | Duration of the event in minutes (0 for instantaneous events) | `60` |

## Timezone Handling

This module supports automatic timezone conversion:

1. Events are defined with times in the timezone specified by `eventTimezone` (default: GMT+7)
2. When `showLocalTime` is enabled, the module automatically converts event times to the local timezone of the device running MagicMirror
3. This conversion happens once when the module loads, adjusting both time and day if necessary (e.g., if an event crosses midnight when converted to local time)
4. If you prefer to display times in their original timezone, set `showLocalTime: false`

### Example

If an event is defined to start at 23:00 in GMT+7:

- For a user in GMT+0: The event will show as starting at 16:00
- For a user in GMT-8: The event will show as starting at 08:00
- If the event crosses to the next day in the user's timezone, the day will also be adjusted accordingly

## License

MIT License 