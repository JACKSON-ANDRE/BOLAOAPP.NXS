/**
 * Calculates the service fee: 10 cents for every 1 Real.
 * Formula: Amount * 0.10
 */
export const calculateServiceFee = (amount: number): number => {
    if (amount <= 0) return 0;
    // 10 centavos a cada 1 Real = 10%
    return amount * 0.10;
};

export const getFeeTable = () => {
    return [
        { range: 'Até R$ 50,00', fee: 'R$ 5,00' },
        { range: 'R$ 50,01 a R$ 100,00', fee: 'R$ 10,00' },
        { range: 'R$ 100,01 a R$ 150,00', fee: 'R$ 15,00' },
        { range: 'R$ 150,01 a R$ 200,00', fee: 'R$ 20,00' },
        { range: 'R$ 200,01 a R$ 250,00', fee: 'R$ 25,00' },
        { range: 'R$ 250,01 a R$ 300,00', fee: 'R$ 30,00' },
        { range: 'Acima de R$ 300,00', fee: '+ R$ 5,00 a cada R$ 50,00' },
    ];
};

