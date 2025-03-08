import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify"

export const AppContent = createContext();

export const AppContextProvider = (props) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const [isLoggedin, setIsLoggedin] = useState(false)
    const [userData, setUserData] = useState(false)

    const getAuthState = async () => {
        try {
            axios.defaults.withCredentials = true; // Ensure credentials are sent with requests
            const {data} = await axios.post(backendUrl + '/api/auth/is-auth')
            if(data.success) {                                  
                setIsLoggedin(true)
                getUserData()
            }
        } catch (error) {
            console.error("Auth check error:", error);
            // Only show toast for non-404 errors as 404 might be expected when not logged in
            if (error.response && error.response.status !== 404) {
                toast.error(error.message || "Authentication check failed")
            }
        }
    }

    const getUserData = async() => {
        try {
            const {data} = await axios.get(backendUrl + '/api/user/data')
            data.success ? setUserData(data.userData) : toast.error(data.message)
        } catch (error) {
            console.error("Get user data error:", error);
            toast.error(error.message || "Failed to fetch user data")
        }
    }

    useEffect(() =>{
        getAuthState();
    }, []);

    const value = {
        backendUrl,
        isLoggedin, setIsLoggedin,
        userData, setUserData,
        getUserData
    }
    return (
        <AppContent.Provider value={value}>
            {props.children}
        </AppContent.Provider>
    )
}