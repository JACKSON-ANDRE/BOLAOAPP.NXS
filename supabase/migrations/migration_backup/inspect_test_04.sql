SELECT 
    p.id, 
    p.title, 
    p.winning_option, 
    p.status,
    b.user_id,
    b.selected_option,
    b.status as bet_status
FROM 
    pools p
JOIN 
    bets b ON p.id = b.pool_id
WHERE 
    p.title = 'TESTE 04';
