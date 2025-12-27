# JSON Resume LinkedIn Experience Exporter
Firefox add-on that exports select LinkedIn experience to JSONResume format. Selection is saved via add-on browser local storage.

## Installation

Go to about:debugging

Click "this firefox"

Enable the extension

## Use


Go to your experience page on LinkedIn `https://linkedin.com/in/<your-profile-name>/experience`

Turn on the add-on, it is available from the sidebar. Use the checkbox to select the roles you want exported. Click the button to export the work field in [JSON Resume](https://jsonresume.org/) json format.


## Development
To run the localhost reload server
```
nvm use 24
npm i
npx web-ext run
```
To inspect add-on:

Go to about:debugging

Click "this firefox"

Click "inspect" next to the add-on
