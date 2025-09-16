<?php
// ----------------------------------------------------🔱🙏HAR HAR MAHADEV🔱🙏----------------------------------------------------
use App\Http\Controllers\ApiMasterController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Models\PropertyListing;
use App\Models\Blog;
use App\Models\Master;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


Route::controller(ApiMasterController::class)->group(function () {
    Route::post('/generateotp', 'generateotp')->name('api.generateotp');
    Route::post('/verifyotp', 'verifyotp')->name('api.verifyotp');
    Route::post('/login-user', 'loginuser')->name('api.loginuser');
    Route::post('/register-user', 'registeruser')->name('api.registeruser');
    Route::get('/blogs', 'blogs')->name('api.blogs');
    Route::get('/property-listings', 'propertylistings')->name('api.propertylistings');
    Route::get('/get-categories', 'getcategories')->name('api.getcategories');
    Route::get('/property-details/{id}', 'propertydetails')->name('api.propertydetails');
    Route::post('/insertlisting', 'insertlisting')->name('api.insertlisting');
    Route::get('/filterlistings', 'filterlistings')->name('api.filterlistings');
    Route::post('/sendenquiry', 'sendenquiry')->name('api.sendenquiry');
    Route::get('/userprofile', 'userprofile')->name('api.userprofile');
    Route::post('/updateuserprofile/{id}', 'updateuserprofile')->name('api.updateuserprofile');
    Route::get('/viewuserlistings', 'viewuserlistings')->name('api.viewuserlistings');
    Route::get('/usernotifications', 'usernotifications')->name('api.usernotifications');
    Route::get('/listingscitywise', 'listingscitywise')->name('api.listingscitywise');
    Route::post('/updatelisting/{id}', 'updatelisting')->name('api.updatelisting');
    Route::post('/appGoogleAuth', 'appGoogleAuth')->name('api.appGoogleAuth');
    Route::post('/googleRegister', 'googleRegister')->name('api.googleRegister');
    Route::post('/deletefile', 'deletefile')->name('api.deletefile');
    Route::get('/brokerlist', 'brokerlist')->name('api.brokerlist');
    Route::get('/brokerprofile', 'brokerprofile')->name('api.brokerprofile');
    Route::get('/fetchenquiries', 'fetchenquiries')->name('api.fetchenquiries');
    Route::get('/bankagentlist', 'bankagentlist')->name('api.bankagentlist');
    Route::get('/bankagentprofile', 'bankagentprofile')->name('api.bankagentprofile');
    Route::post('/update-bid-status', 'UpdateBidStatus')->name('api.UpdateBidStatus');
    Route::post('/updatebidamount', 'UpdateBidAmount')->name('api.UpdateBidAmount');
    Route::post('/deletelisting', 'deletelisting')->name('api.deletelisting');
    Route::get('/checkWishlistStatus/{userId}/{propertyId}', 'checkWishlistStatus')->name('checkWishlistStatus');
    Route::post('/addToWishlist', 'addToWishlist')->name('addToWishlist');
    Route::get('/getencryptedid/{id}', 'getEncryptedId')->name('getEncryptedId');
    Route::get('/mywishlists/{id}', 'mywishlists')->name('mywishlists');
    Route::post('/trackvisit', 'trackvisit')->name('trackvisit');
    Route::get('/getVisitorCount/{propertyId}', 'getVisitorCount')->name('getVisitorCount');
    Route::get('/fetchenquiry/{id}', 'fetchenquiry')->name('fetchenquiry');
    Route::post('/updatefollowup', 'updatefollowup')->name('updatefollowup');
    Route::get('/upcomingproject', 'upcomingproject')->name('upcomingproject');
    Route::get('/fetchproject/{id}', 'fetchproject')->name('fetchproject');
    Route::post('/send-otp', 'sendOtp')->name('sendOtp');
});
