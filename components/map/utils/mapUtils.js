// components/map/utils/mapUtils.js
export const parseCoordinates = (maplocations) => {
    try {
        if (!maplocations) throw new Error('maplocations is missing');
        const location = JSON.parse(maplocations);
        const latitude = parseFloat(location.Latitude);
        const longitude = parseFloat(location.Longitude);
        if (isNaN(latitude) || isNaN(longitude)) {
            throw new Error('Invalid coordinates');
        }
        return { latitude, longitude };
    } catch (error) {
        console.error('Error parsing maplocations:', error, maplocations);
        return { latitude: 26.4499, longitude: 74.6399 };
    }
};

export const parseProjectCoordinates = (coordinatesStr) => {
    try {
        if (!coordinatesStr) throw new Error('coordinates is missing');
        const coords = JSON.parse(coordinatesStr);
        if (!Array.isArray(coords)) throw new Error('Coordinates is not an array');
        return coords
            .filter((c) => c.lat && c.lng && !isNaN(parseFloat(c.lat)) && !isNaN(parseFloat(c.lng)))
            .map((c) => ({
                latitude: parseFloat(c.lat),
                longitude: parseFloat(c.lng),
            }));
    } catch (error) {
        console.error('Error parsing project coordinates:', error, coordinatesStr);
        return [];
    }
};

export const calculateCentroid = (coords) => {
    if (coords.length === 0) return { latitude: 26.4499, longitude: 74.6399 };
    let latSum = 0, lngSum = 0;
    coords.forEach((c) => {
        latSum += c.latitude;
        lngSum += c.longitude;
    });
    return {
        latitude: latSum / coords.length,
        longitude: lngSum / coords.length,
    };
};

export const formatINR = (amount) => {
    if (!amount) return '₹0';
    const cleaned = String(amount).replace(/[₹,]/g, '').trim();
    const num = Number(cleaned);
    if (isNaN(num) || num <= 0) return '₹0';
    if (num >= 1e7) {
        return '₹' + (num / 1e7).toFixed(2).replace(/\.00$/, '') + ' Cr';
    } else if (num >= 1e5) {
        return '₹' + (num / 1e5).toFixed(1).replace(/\.0$/, '') + ' L';
    }
    return '₹' + num.toLocaleString('en-IN');
};