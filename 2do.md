# Implement the orders page. I want the user to see all orders and the necessary information with them
# Allow reorder or an already ordered in the orders page where one click pre-fills the Orders section in the pos page - with redirect.
# In the orders page, allow the user to identify a particular order with a name (like the cusomters nicky) so that it'll be easier to identify and proceed if the customer comes back and say they want the usual
# In the customer display page, I want the RIGHT SECTION: Scan to Pay, to be two tabs: Scan to Pay (default) and Our MOMO Number. I want the Scan to Pay tab to only display the QR code image immediately the first order shows, if not, display an empty box and say, waiting for your order. I'd like the QR code to lead to a specific URL with the current total price as a parameter. The "Our MOMO Number" tab will display the MOMO number, Account name and Merchant id. Now, on the LEFT SECTION: Your Order, I want to allow the customer to select how they'd like their receipt: paper receipt or SMS receipt (a small input to take their phone and send - for now, let's receive the numbers in supabase) or none (default)
# Persist the orders in the Orders section in the pos page and also the "Your orders" in the customer display page so that they don't disappear after referesh and also clear the "Your orders" in the customer display page when the user clears the "Order" in the pos page.
# Rebuild the header or topbar component in the pos page. hide the menu items in a dropdown
  - RBAC
- Let's rewrite the Reports page. It appears the current version isn't in line with the order or pos and supabase.
# connect the orders and inventory to supabase. and make sure the user can create new inventory item

# When an order is completed, should inventory reduce automatically? 
  # Connect inventory to Supabase and keep stock adjustment manager-controlled until recipes/usage rules are defined
  - Auto-deduct basic amount: Deduct estimated stock on completed orders using simple category/item mapping, but this may be inaccurate without recipes.


- Change order date format to be readable
- Allow order edits but keep the records of the edited
  - Enable Role Base Access Control here
- A loading state UI in the pos page.
- Reference the `auth-eg.md` file and implement a similar authentication system into this app