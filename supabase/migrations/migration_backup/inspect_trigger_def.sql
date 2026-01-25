select pg_get_triggerdef(oid) 
from pg_trigger 
where tgname = 'on_transaction_created';
