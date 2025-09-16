import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import axios from 'axios';

const Filters = () => {
    const params = useLocalSearchParams();
    const router = useRouter();

    const [selectedCategory, setSelectedCategory] = useState(params.propertyType || 'All');
    const [categoryData, setCategoryData] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleCategoryPress = (category) => {
        const isRemovingFilter = selectedCategory === category;

        // Prepare new query parameters
        const updatedParams = { ...params };

        if (isRemovingFilter) {
            delete updatedParams.propertyType; // Remove filter if category is already selected
            setSelectedCategory('All');
        } else {
            updatedParams.propertyType = category;
            setSelectedCategory(category);
        }

        // Navigate with updated query parameters
        router.push({
            pathname: "/properties/explore",
            params: updatedParams,
        });
    };

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await axios.get("https://landsquire.in/api/get-categories");

            if (response.data && response.data.categories) {
                setCategoryData(response.data.categories);
            } else {
                console.error("Unexpected API response format:", response.data);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 ">
            <TouchableOpacity
                key="all"
                onPress={() => handleCategoryPress('All')}
                className={`flex items-start mr-2 px-5  py-3  rounded-3xl ${selectedCategory === 'All' ? 'bg-primary-300' : 'bg-primary-100'
                    }`}
            >
                <Text className={`text-sm font-rubik ${selectedCategory === 'All' ? 'text-white  ' : 'text-black-300'}`}>
                    All
                </Text>
            </TouchableOpacity>

            {categoryData.map((item) => (
                <TouchableOpacity
                    key={item.id.toString()} // ✅ Ensure unique key
                    onPress={() => handleCategoryPress(item.label)}
                    className={`flex items-start mr-2 px-5  py-3 rounded-xl ${selectedCategory === item.label ? 'bg-primary-300' : 'bg-primary-100'
                        }`}
                >
                    <Text className={`text-sm font-rubik ${selectedCategory === item.label ? 'text-white' : 'text-black-300 '}`}>
                        {item.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

export default Filters;

const styles = StyleSheet.create({});
