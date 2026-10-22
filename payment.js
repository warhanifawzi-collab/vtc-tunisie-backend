const express = require('express');
const router = express.Router();

// Endpoint pour initialiser un paiement
router.post('/api/payment/create', async (req, res) => {
    try {
        const { tripId, amount, customerId } = req.body;

        if (!tripId || !amount || !customerId) {
            return res.status(400).json({ 
                success: false, 
                message: "Les informations de la course sont incomplètes." 
            });
        }

        // Simuler la génération d'un lien de paiement (à remplacer par l'API Konnect/Stripe)
        const paymentSession = {
            payUrl: "https://gateway.tunisie-payment.tn/pay/sessionId123",
            paymentId: "PAY_" + Date.now(),
            status: "PENDING"
        };

        return res.status(200).json({
            success: true,
            message: "Session de paiement créée avec succès",
            data: paymentSession
        });

    } catch (error) {
        console.error("Erreur paiement:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Erreur interne du serveur." 
        });
    }
});

module.exports = router;