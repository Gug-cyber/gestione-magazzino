import React, { useState } from 'react';

const Prodotti = ({ prodotti }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const filteredProdotti = prodotti.filter((prodotto) => {
        return ( 
            prodotto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            prodotto.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            prodotto.descrizione.toLowerCase().includes(searchTerm.toLowerCase()) ||
            prodotto.stato_conservazione.toLowerCase().includes(searchTerm.toLowerCase()) ||
            prodotto.lingua.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    return (
        <div>
            <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={handleSearchChange}
            />
            <ul>
                {filteredProdotti.map((prodotto) => (
                    <li key={prodotto.id}>{prodotto.nome}</li>
                ))}
            </ul>
        </div>
    );
};

export default Prodotti;