# Notary

Backend for Notary System

## Install packages using

`npm install`

## Run server using



`npm start`

### SETUP BEFORE DEPLOYMENT

1. Firebase credentials
- In `server/firebase-cred.json` we need the firebase credentials
- On Firebase console, go to `Project settings -> Service Accounts -> Generate new private key`
- The above step will download a file
- This is the file which should be renamed as `firebase-cred.json` and replace the old one
- Please also add the database URL in `server/db/firebase-db.js`

2. QuickBooks Setup (Before) `server/quickbooks-config.json`
- NOTE -- QUICKBOOKS MUST BE SETUP EITHER BEFORE OR AFTER DEPLOYMENT. NOT TWICE.
- We need following data from whichever QuickBooks Account we use:

- - `Client Id` and `Client Secret` for the respective environment
- - - Separate pair of keys for "production" or "sandbox"(development)

- - `Redirect URI` which must be set both on QuickBooks page as well as in our file, according to our final server URL
- - - E.g. If my server is at https://api.notarizeddocs.com/ , then redirectUri will be ::
- - - https://api.notarizeddocs.com/quickbooks/callback/home

- - An Item Id for the QBO `Invoice` :: TO BE SET MANUALLY IN `models/Order/order.model.js Line 13`

- - An Account Id for the QBO `Bill` (Payout) :: TO BE SET MANUALLY IN `models/Order/order.model.js Line 14`

### SETUP AFTER DEPLOYMENT BUT BEFORE ANYONE STARTS USING IT

1. Master admin
- There must be one `master admin` saved in our database (MongoDB)

2. Order rates
- There must be one `order rates` saved in our database (MongoDB)

3. Notary rates
- There must be one `notary rates` saved in our database (MongoDB)

4. QuickBooks Setup (After) [ONLY-IF-NOT-SETUP-BEFORE-DEPLOYMENT]
NOTE :: TO SETUP AFTER DEPLOYMENT, THERE ARE 2 APIS IN `routes/quickbooks.api.js`
- We need following data from whichever QuickBooks Account we use:

- - `Client Id` and `Client Secret` for the respective environment
- - - Separate pair of keys for "production" or "sandbox"(development)

- - `Redirect URI` which must be set both on QuickBooks page as well as in our file, according to our final server URL
- - - E.g. If my server is at https://api.notarizeddocs.com/ , then redirectUri will be ::
- - - https://api.notarizeddocs.com/quickbooks/callback/home

- - An Item Id for the QBO `Invoice`
- - - All Invoices will be charged for this Item Id, but the amount will be according to order rates

- - An Account Id for the QBO `Bill` (Payout)
- - - All Bills will be charged to this account, but the amount will be according to notary rates


### Trip Status
-- ENQUIRY 0 
-- SCHEDULED 1  
-- DRIVER ASSIGNED 2
-- IN-PROGRESS 3
-- COMPLETED 4
-- CANCELLED_BY_USER 5
-- CANCELLED_BY_DRIVER 6
-- WAITING FOR PAYMENT CONFIRMATION - 7
-- CANCELLED BY VENDOR 8