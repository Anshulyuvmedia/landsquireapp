<?php
// ----------------------------------------------------🔱🙏HAR HAR MAHADEV🔱🙏----------------------------------------------------
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RegisterUser;
use Auth, Hash, Exception;
use App\Models\Blog;
use App\Models\Lead;
use App\Models\Notification;
use App\Models\PropertyListing;
use App\Models\Master;
use Log;
use Laravel\Socialite\Facades\Socialite;
use Google_Client;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use App\Notifications\BidLiveNotification;
use Illuminate\Support\Facades\File;
use App\Models\Wishlist;
use App\Models\PropertyVisit;
use App\Models\UpcomingProject;

class ApiMasterController extends Controller
{
    private function validateToken(Request $request)
    {
        $token = $request->header('Authorization');

        if (!$token) {
            return response()->json(
                [
                    'success' => false,
                    'message' => 'Authorization token missing',
                ],
                401,
            );
        }

        $token = str_replace('Bearer ', '', $token);
        $user = RegisterUser::where('api_token', $token)->first();

        if (!$user) {
            return response()->json(
                [
                    'success' => false,
                    'message' => 'Invalid or expired token',
                ],
                401,
            );
        }

        return $user;
    }

    public function loginuser(Request $rq)
    {
        try {
            $user = RegisterUser::where('email', $rq->email)->first();
            if ($user) {
                if (Hash::check($rq->password, $user->password)) {
                    Auth::guard('customer')->login($user);
                    if (Auth::guard('customer')->check()) {
                        $user->verification_status = 1;
                        $user->save();

                        // Generate API token for authentication
                        $token = $user->createToken('AuthToken')->plainTextToken;
                        $response = [
                            'success' => true,
                            'token' => $token,
                            'data' => $user,
                            'message' => 'Login Successfully..!!!!!',
                        ];
                    } else {
                        $response = [
                            'success' => false,
                            'message' => 'Invalid..!!!!!',
                        ];
                    }
                } else {
                    $response = [
                        'success' => false,
                        'message' => 'Invalid Password..!!!',
                    ];
                }
            } else {
                $response = [
                    'success' => false,
                    'message' => 'Invalid Email..!!!',
                ];
            }
        } catch (Exception $e) {
            $response = [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }

        return response()->json($response);
    }

    public function registeruser(Request $rq)
    {
        $thumbnailFilename = null;

        try {
            // Check if email already exists
            if (RegisterUser::where('email', $rq->email)->exists()) {
                return response()->json(
                    [
                        'success' => false,
                        'message' => 'This email is already registered. Please use a different email or log in.',
                    ],
                    400,
                );
            }

            if ($rq->hasFile('company_document')) {
                $rq->validate([
                    'company_document' => 'required|mimes:jpeg,pdf,jpg',
                ]);

                $file = $rq->file('company_document');
                $thumbnailFilename = time() . '_' . $file->getClientOriginalName();
                $file->move(public_path('adminAssets/images/Users'), $thumbnailFilename);
            }

            $attributes = RegisterUser::create([
                'user_type' => $rq->user_type,
                'username' => $rq->name,
                'mobilenumber' => $rq->mobile,
                'email' => $rq->email,
                'city' => $rq->city,
                'state' => $rq->state,
                'bankname' => $rq->bankname,
                'company_name' => $rq->company_name,
                'company_document' => $thumbnailFilename,
                'password' => Hash::make($rq->password),
                'profile' => 'defaultuser.png',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'You have been Registered Successfully..!!!',
                'data' => $attributes,
            ]);
        } catch (Exception $e) {
            return response()->json(
                [
                    'success' => false,
                    'message' => 'Registration failed: ' . $e->getMessage(),
                ],
                500,
            );
        }
    }

    public function generateotp(Request $request)
    {
        // Log::info('Generate OTP Request:', $request->all());

        $validator = Validator::make($request->all(), [
            'mobilenumber' => 'required|digits:10',
        ]);

        if ($validator->fails()) {
            Log::error('Validation failed:', $validator->errors()->toArray());
            return response()->json(
                [
                    'success' => false,
                    'message' => $validator->errors()->first(),
                ],
                400,
            );
        }

        $credentials = $request->only('mobilenumber');
        $user = RegisterUser::where('mobilenumber', $credentials['mobilenumber'])->first();

        if ($user) {
            $otp = rand(100000, 999999);
            // $this->sendOtp($user->mobilenumber, $otp);
            $user->update(['otp' => $otp]);

            // Log::info('OTP generated for user ID:', ['id' => $user->id, 'otp' => $otp]);
            return response()->json(
                [
                    'success' => true,
                    'data' => ['id' => $user->id, 'otp' => $otp], // Remove otp in production
                    'message' => 'OTP generated successfully',
                ],
                200,
            );
        }

        Log::warning('Mobile number not found:', $credentials);
        return response()->json(
            [
                'success' => false,
                'message' => 'Mobile number not found',
            ],
            404,
        );
    }
    public function sendOtp($mobilenumber, $otpnumber)
    {
        $name = "Land Squire";

        try {
            $response = Http::withToken(env('SMS_KEY'))
                ->post('https://sms.jaipursmshub.in/api_v2/message/send', [
                    'sender_id' => 'PTPSMS',
                    'dlt_template_id' => '1207168605001414924',
                    'message' => 'Hi Your User OTP is: ' . $otpnumber . ' Thank you ! ' . $name . ' PTPSMS',
                    'mobile_no' => $mobilenumber,
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'OTP sent successfully',
                    'sms_api_response' => $response->json(),
                ], 200);
            }

            return response()->json([
                'success' => false,
                'message' => 'Failed to send OTP',
                'error' => $response->json(),
            ], 500);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Something went wrong',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
    public function verifyotp(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'loginformidval' => 'required|exists:register_users,id',
                '1' => 'required|digits:1',
                '2' => 'required|digits:1',
                '3' => 'required|digits:1',
                '4' => 'required|digits:1',
                '5' => 'required|digits:1',
                '6' => 'required|digits:1',
            ]);

            if ($validator->fails()) {
                return response()->json(
                    [
                        'success' => false,
                        'message' => $validator->errors()->first(),
                    ],
                    400,
                );
            }

            $user = RegisterUser::find($request->input('loginformidval'));
            // Use explicit key access to ensure correct digit order
            $enteredOtp = $request->input('1') . $request->input('2') . $request->input('3') . $request->input('4') . $request->input('5') . $request->input('6');
            // Log::info('Verifying OTP', ['user_id' => $user->id, 'stored_otp' => $user->otp, 'entered_otp' => $enteredOtp]);

            if ($user && $user->otp == $enteredOtp) {
                Auth::guard('customer')->login($user);
                $user->verification_status = 1;

                $token = hash('sha256', $user->id . time() . $user->otp);

                $user->api_token = $token;
                $user->save();

                return response()->json(
                    [
                        'success' => true,
                        'token' => $token,
                        'data' => $user,
                        'message' => 'Login Successfully..!!!!!',
                    ],
                    200,
                );
            }

            return response()->json(
                [
                    'success' => false,
                    'message' => 'OTP not verified',
                ],
                401,
            );
        } catch (Exception $e) {
            Log::error('OTP verification error: ' . $e->getMessage());
            return response()->json(
                [
                    'success' => false,
                    'message' => 'An error occurred during OTP verification: ' . $e->getMessage(),
                ],
                500,
            );
        }
    }

    public function blogs()
    {
        $blogs = Blog::orderBy('created_at', 'desc')->get();
        return response()->json([
            'success' => true,
            'data' => $blogs,
        ]);
    }

    public function propertylistings(Request $req)
    {
        $user = $this->validateToken($req);
        if (is_a($user, '\Illuminate\Http\JsonResponse')) {
            return $user;
        }

        $category = $req->query('filtercategory');
        $city = $req->query('filtercity');
        $minprice = $req->query('filterminprice');
        $maxprice = $req->query('filtermaxprice');

        $listings = PropertyListing::query();

        if ($category) {
            $listings->where('category', $category);
        }

        if ($city) {
            $listings->where('city', $city);
        }

        if ($minprice) {
            $listings->where('price', '>=', $minprice);
        }

        if ($maxprice) {
            $listings->where('price', '<=', $maxprice);
        }

        $listings = $listings->where('status', 'published')->orderBy('featuredstatus', 'desc')->orderBy('created_at', 'desc')->get(); // 👈 no pagination, just return all

        return response()->json([
            'success' => true,
            'data' => $listings,
        ]);
    }

    public function getcategories()
    {
        $categories = Master::where('type', 'Property Categories')->get();
        return response()->json([
            'success' => true,
            'categories' => $categories,
        ]);
    }

    public function propertydetails(Request $req, $id)
    {
        $user = $this->validateToken($req);
        if (is_a($user, '\Illuminate\Http\JsonResponse')) {
            return $user;
        }

        $propertydetails = PropertyListing::find($id);
        $bokerId = $propertydetails->roleid;
        $brokerdata = RegisterUser::select('username', 'profile', 'email', 'company_name', 'mobilenumber')->where('id', $bokerId)->where('user_type', 'broker')->where('verification_status', '1')->get();
        return response()->json([
            'success' => true,
            'brokerdata' => $brokerdata,
            'details' => $propertydetails,
        ]);
    }

    public function insertlisting(Request $request)
    {
        $datareq = $request->all();
        // \Log::info('Received Data:', $request->all());
        try {
            // Handle the thumbnail image
            $thumbnailFilename = null;
            if ($request->hasFile('thumbnailImages')) {
                $request->validate([
                    'thumbnailImages' => 'required|mimes:jpeg,png,jpg',
                ]);

                $file = $request->file('thumbnailImages');
                $thumbnailFilename = time() . '_' . $file->getClientOriginalName();
                $file->move(public_path('adminAssets/images/Listings'), $thumbnailFilename);
            }

            // Handle Master Plan Document
            $masterdoc = null;
            if ($request->hasFile('masterplandocument')) {
                $request->validate([
                    'masterplandocument' => 'required|mimes:pdf,jpeg,jpg',
                ]);

                $file = $request->file('masterplandocument');
                $masterdoc = time() . '_' . $file->getClientOriginalName();
                $file->move(public_path('adminAssets/images/Listings'), $masterdoc);
            }

            // \Log::info("Received Gallery Images", ['files' => $request->file('galleryImages')]);

            // Handle multiple gallery images
            $galleryImages = [];
            if ($request->hasFile('galleryImages')) {
                $request->validate([
                    'galleryImages.*' => 'required|image|mimes:jpeg,png,jpg',
                ]);
                foreach ($request->file('galleryImages') as $file) {
                    $imageName = md5(rand(1000, 10000)) . '.' . strtolower($file->getClientOriginalExtension());
                    $file->move(public_path('adminAssets/images/Listings'), $imageName);
                    $galleryImages[] = 'adminAssets/images/Listings/' . $imageName;
                }
            } else {
                // \Log::info("🚨 No gallery images detected in request.");
            }

            // Handle multiple documents
            $documents = [];
            if ($request->hasFile('documents')) {
                $request->validate([
                    'documents.*' => 'required|mimes:pdf,jpeg,jpg',
                ]);
                foreach ($request->file('documents') as $file) {
                    $docName = md5(rand(1000, 10000)) . '.' . strtolower($file->getClientOriginalExtension());
                    $file->move(public_path('adminAssets/images/Listings'), $docName);
                    $documents[] = 'adminAssets/images/Listings/' . $docName;
                }
            }

            // Handle multiple videos
            $Videos = [];
            if ($request->hasFile('propertyvideos')) {
                $request->validate([
                    'propertyvideos.*' => 'required|mimes:mp4,mov,avi',
                ]);
                foreach ($request->file('propertyvideos') as $file) {
                    $videoName = md5(rand(1000, 10000)) . '.' . strtolower($file->getClientOriginalExtension());
                    $file->move(public_path('adminAssets/images/Listings'), $videoName);
                    $Videos[] = 'adminAssets/images/Listings/' . $videoName;
                }
            }

            // Create the property listing (Ensure all fields are checked)
            $data = PropertyListing::create([
                'usertype' => $datareq['usertype'] ?? 'agent',
                'roleid' => $datareq['roleid'] ?? '4',
                'property_name' => $datareq['property_name'] ?? '',
                'nearbylocation' => $datareq['nearbylocation'] ?? '',
                'approxrentalincome' => $datareq['approxrentalincome'] ?? '',
                'discription' => strip_tags($datareq['description'] ?? ''), // Remove HTML tags
                'price' => $datareq['price'] ?? '',
                // 'pricehistory' => json_encode(is_string($datareq['historydate']) ? json_decode($datareq['historydate'], true) : $datareq['historydate'] ?? []),
                'squarefoot' => $datareq['landarea'] ?? '',
                'bedroom' => $datareq['bedroom'] ?? '',
                'bathroom' => $datareq['bathroom'] ?? '',
                'floor' => $datareq['floor'] ?? '',
                'city' => $datareq['city'] ?? '',
                'address' => $datareq['officeaddress'] ?? '',
                'thumbnail' => $thumbnailFilename ?? '',
                'masterplandoc' => $masterdoc ?? '',
                'maplocations' => $datareq['location'] ?? ['Latitude' => '', 'Longitude' => ''],
                'category' => $datareq['category'] ?? '',
                'propertyfor' => $datareq['propertyfor'] ?? '',
                'subcategory' => $datareq['subcategory'] ?? '',
                'gallery' => json_encode($galleryImages),
                'documents' => json_encode($documents),
                'amenties' => $datareq['amenities'] ?? [],
                'videos' => json_encode($Videos) ?? [],
                'status' => 'unpublished',
            ]);

            return response()->json(['data' => $data, 'message' => 'Listing inserted successfully!']);
        } catch (Exception $e) {
            return response()->json(['error' => true, 'message' => $e->getMessage()]);
        }
    }

    public function filterlistings(Request $req)
    {
        $category = $req->query('filtercategory');
        $city = $req->query('filtercity');
        $propertyFor = $req->query('filterpropertyfor');
        $minprice = $req->query('filterminprice');
        $maxprice = $req->query('filtermaxprice');
        $sqftfrom = $req->query('sqftfrom');
        $sqftto = $req->query('sqftto');

        // Log::info('Filters:', [
        //     'category' => $category,
        //     'city' => $city,
        //     'propertyFor' => $propertyFor,
        //     'minprice' => $minprice,
        //     'maxprice' => $maxprice,
        //     'sqftfrom' => $sqftfrom,
        //     'sqftto' => $sqftto,
        // ]);

        $listings = PropertyListing::query();

        if ($category && $category !== 'all') {
            $listings->where('category', $category);
        }

        if ($city && $city !== 'all') {
            $listings->where('city', $city);
        }

        if ($propertyFor) {
            $listings->where('propertyfor', $propertyFor);
        }

        if ($minprice && $maxprice) {
            $listings->whereBetween('price', [$minprice, $maxprice]);
        } elseif ($minprice) {
            $listings->where('price', '>=', $minprice);
        } elseif ($maxprice) {
            $listings->where('price', '<=', $maxprice);
        }

        if ($sqftfrom && $sqftto) {
            $listings->whereBetween('squarefoot', [$sqftfrom, $sqftto]);
        } elseif ($sqftfrom) {
            $listings->where('squarefoot', '>=', $sqftfrom);
        } elseif ($sqftto) {
            $listings->where('squarefoot', '<=', $sqftto);
        }

        $listings = $listings->where('status', 'published')->orderBy('featuredstatus', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $listings,
        ]);
    }

    public function sendenquiry(Request $rq)
    {
        try {
            $bidamount = $rq->bidamount;
            $currentdate = now();

            // Find existing lead
            $lead = Lead::where('propertyid', $rq->propertyid)->where('userid', $rq->userid)->first();
            // Get old bid history and append new bid
            // $bidHistory = [];
            // if ($lead && $lead->propertybid) {
            //     $bidHistory = json_decode($lead->propertybid, true) ?? [];
            // }
            $bidHistory[] = [
                'date' => $currentdate->toDateString(),
                'bidamount' => $bidamount,
            ];

            $data = Lead::updateOrCreate(
                ['propertyid' => $rq->propertyid, 'userid' => $rq->userid],
                [
                    'name' => $rq->customername,
                    'mobilenumber' => $rq->phone,
                    'email' => $rq->email,
                    'city' => $rq->city,
                    'state' => $rq->state,
                    'inwhichcity' => $rq->usercity,
                    'housecategory' => $rq->propertytype,
                    'propertyid' => $rq->propertyid,
                    'userid' => $rq->userid,
                    'agentid' => $rq->brokerid,
                    'form_type' => $rq->form_type,
                    'propertybid' => json_encode($bidHistory),
                ],
            );
            return response()->json(['success' => true, 'data' => $data, 'message' => 'Enquiry Sent..!!!']);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function userprofile(Request $rq)
    {
        $user = $this->validateToken($rq);
        if (is_a($user, '\Illuminate\Http\JsonResponse')) {
            return $user;
        }

        $userId = $rq->query('id'); // Use query parameter
        // \Log::info('Requested User ID: ' . $userId); // Debug
        if ($userId != $user->id) {
            return response()->json(['success' => false, 'message' => 'Cannot access another user\'s profile'], 409);
        }

        $userprofiledata = RegisterUser::find($userId);
        if (!$userprofiledata) {
            return response()->json(['success' => false, 'message' => 'User not found'], 404);
        }

        return response()->json(['success' => true, 'data' => $userprofiledata]);
    }

    public function updateuserprofile(Request $request, $id)
    {
        try {
            $user = $this->validateToken($request);
            if (is_a($user, '\Illuminate\Http\JsonResponse')) {
                // Log request payload as an array of key-value pairs
                Log::info('Request payload:', $request->all());
                return $user;
            }

            // Log user ID and request payload
            Log::info('User ID:', ['id' => $id]);
            Log::info('Request payload:', $request->all());

            $user = RegisterUser::find($id);
            $filenameprofileimage = $user->profile ?? '';
            $thumbnailFilename = $user->company_document ?? null;

            if ($request->hasFile('myprofileimage')) {
                $request->validate([
                    'myprofileimage' => 'image|mimes:jpeg,png,jpg|max:2048',
                ]);
                $profileimage = $request->file('myprofileimage');
                $filenameprofileimage = time() . '_' . $profileimage->getClientOriginalName();
                $profileimage->move(public_path('adminAssets/images/Users'), $filenameprofileimage);
            }

            if ($request->hasFile('company_document')) {
                $request->validate([
                    'company_document' => 'required|mimes:jpeg,pdf,jpg',
                ]);

                $file = $request->file('company_document');
                $thumbnailFilename = time() . '_' . $file->getClientOriginalName();
                $file->move(public_path('adminAssets/images/Users'), $thumbnailFilename);
            }

            $user->update([
                'username' => $request->name,
                'email' => $request->email,
                'city' => $request->city,
                'state' => $request->state,
                'mobilenumber' => $request->mobile,
                'company_name' => $request->company_name,
                'bankname' => $request->bankname,
                'profile' => $filenameprofileimage ?: $user->profile,
                'company_document' => $thumbnailFilename ?: $user->company_document,
            ]);

            return response()->json(['success' => true, 'message' => 'Profile Updated..!!!', 'data' => $user]);
        } catch (Exception $e) {
            Log::error('Error updating profile: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function viewuserlistings(Request $rq)
    {
        $user = $this->validateToken($rq);
        if (is_a($user, '\Illuminate\Http\JsonResponse')) {
            return $user;
        }

        // Now safe to fetch listings
        $allproperties = PropertyListing::where('roleid', $user->id)->orderBy('created_at', 'DESC')->get();

        $allpropertiescnt = $allproperties->count();

        return response()->json([
            'success' => true,
            'properties' => $allproperties,
            'count' => $allpropertiescnt,
        ]);
    }

    public function usernotifications(Request $rq)
    {
        $user = $this->validateToken($rq);
        if (is_a($user, '\Illuminate\Http\JsonResponse')) {
            return $user;
        }

        if (!$rq->id) {
            return response()->json(
                [
                    'success' => false,
                    'message' => 'User ID is required',
                ],
                400,
            );
        }

        try {
            // Fetch notifications
            $notifications = Notification::select('id', 'data', 'notifiable_id', 'read_at', 'created_at')->where('notifiable_id', $rq->id)->orderBy('created_at', 'DESC')->get();

            $notifycnt = $notifications->count();

            // Collect property IDs
            $propertyIds = [];
            foreach ($notifications as $notification) {
                $notificationData = json_decode($notification->data, true);
                if (json_last_error() === JSON_ERROR_NONE && isset($notificationData['property_id'])) {
                    $propertyIds[] = $notificationData['property_id'];
                }
            }
            $propertyIds = array_unique($propertyIds);

            // Fetch properties
            $properties = [];
            if (!empty($propertyIds)) {
                $properties = PropertyListing::select('thumbnail', 'id', 'property_name', 'bidenddate')->whereIn('id', $propertyIds)->get()->keyBy('id')->toArray();
            }

            // Merge notifications with properties
            $mergedNotifications = $notifications->map(function ($notification) use ($properties) {
                $notificationData = json_decode($notification->data, true);
                $merged = $notification->toArray();

                if (json_last_error() === JSON_ERROR_NONE && isset($notificationData['property_id'])) {
                    $propertyId = $notificationData['property_id'];
                    $merged['property'] = $properties[$propertyId] ?? null;
                } else {
                    $merged['property'] = null;
                }

                return $merged;
            });

            return response()->json([
                'success' => true,
                'notifications' => $mergedNotifications,
                'count' => $notifycnt,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error fetching notifications', [
                'error' => $e->getMessage(),
                'user_id' => $rq->id,
            ]);
            return response()->json(
                [
                    'success' => false,
                    'message' => 'Error fetching notifications: ' . $e->getMessage(),
                ],
                500,
            );
        }
    }

    public function listingscitywise()
    {
        $cityListings = PropertyListing::where('status', 'published')->get()->groupBy('city');

        $listingsbycitys = Master::where('type', 'City')->get();
        foreach ($listingsbycitys as $city) {
            $cityName = $city->label;

            $city->listings = $cityListings[$cityName] ?? collect();
            $city->property_count = $city->listings->count();
        }
        return response()->json([
            'success' => true,
            'data' => $listingsbycitys,
        ]);
    }

    public function updatelisting(Request $request, $id)
    {
        $user = $this->validateToken($request);
        if (is_a($user, '\Illuminate\Http\JsonResponse')) {
            return $user;
        }

        $datareq = $request->all();
        Log::info('Received Data:', $request->all());
        try {
            $olddata = PropertyListing::find($id);
            // Handle the thumbnail image
            $thumbnailFilename = null;
            if ($request->hasFile('thumbnailImages')) {
                $request->validate([
                    'thumbnailImages' => 'required|mimes:jpeg,png,jpg',
                ]);

                $file = $request->file('thumbnailImages');
                $thumbnailFilename = time() . '_' . $file->getClientOriginalName();
                $file->move(public_path('adminAssets/images/Listings'), $thumbnailFilename);
            }

            // Handle the Master Plan Doc
            $masterdoc = $olddata->masterplandoc;
            if ($request->hasFile('masterplandocument')) {
                $request->validate([
                    'masterplandocument' => 'required|mimes:pdf,jpeg,jpg',
                ]);

                $file = $request->file('masterplandocument');
                $masterdoc = time() . '_' . $file->getClientOriginalName();
                $file->move(public_path('adminAssets/images/Listings'), $masterdoc);
            }

            // Handle multiple gallery images (merge with old data)
            $galleryImages = json_decode($olddata->gallery, true) ?? [];
            if ($request->hasFile('galleryImages')) {
                $request->validate([
                    'galleryImages.*' => 'required|image|mimes:jpeg,png,jpg',
                ]);
                foreach ($request->file('galleryImages') as $file) {
                    $imageName = md5(rand(1000, 10000)) . '.' . $file->getClientOriginalExtension();
                    $file->move(public_path('adminAssets/images/Listings'), $imageName);
                    $galleryImages[] = 'adminAssets/images/Listings/' . $imageName;
                }
            }

            // Handle multiple documents (merge with old data)
            $documents = json_decode($olddata->documents, true) ?? [];
            if ($request->hasFile('documents')) {
                $request->validate([
                    'documents.*' => 'required|mimes:pdf,jpeg,jpg',
                ]);
                foreach ($request->file('documents') as $file) {
                    $documentName = md5(rand(1000, 10000)) . '.' . $file->getClientOriginalExtension();
                    $file->move(public_path('adminAssets/images/Listings'), $documentName);
                    $documents[] = 'adminAssets/images/Listings/' . $documentName;
                }
            }

            // Handle multiple Videos (merge with old data)
            $Videos = json_decode($olddata->videos, true) ?? [];
            if ($request->hasFile('propertyvideos')) {
                $request->validate([
                    'propertyvideos.*' => 'required|mimes:mp4,mov,avi',
                ]);
                foreach ($request->file('propertyvideos') as $file) {
                    $videoName = md5(rand(1000, 10000)) . '.' . $file->getClientOriginalExtension();
                    $file->move(public_path('adminAssets/images/Listings'), $videoName);
                    $Videos[] = 'adminAssets/images/Listings/' . $videoName;
                }
            }

            $propertydata = PropertyListing::where('id', $id)->update([
                'roleid' => $datareq['roleid'],
                'property_name' => $datareq['property_name'],
                'nearbylocation' => $datareq['nearbylocation'] ?? '',
                'approxrentalincome' => $datareq['approxrentalincome'] ?? '',
                'discription' => strip_tags($datareq['description'] ?? ''), // Remove HTML tags
                'price' => $datareq['price'] ?? '',
                'pricehistory' => $datareq['historydate'] ?? '',
                'squarefoot' => $datareq['landarea'] ?? '',
                'bedroom' => $datareq['bedroom'] ?? '',
                'bathroom' => $datareq['bathroom'] ?? '',
                'floor' => $datareq['floor'] ?? '',
                'city' => $datareq['city'] ?? '',
                'address' => $datareq['officeaddress'] ?? '',
                'thumbnail' => $thumbnailFilename ?? $olddata->thumbnail,
                'masterplandoc' => $masterdoc ?? $olddata->masterdoc,
                'maplocations' => $datareq['location'] ?? $olddata->maplocations,
                'category' => $datareq['category'] ?? '',
                'propertyfor' => $datareq['propertyfor'] ?? '',
                'subcategory' => $datareq['subcategory'] ?? '',
                'gallery' => !empty($galleryImages) ? json_encode($galleryImages) : $olddata->gallery,
                'documents' => !empty($documents) ? json_encode($documents) : $olddata->documents,
                'amenties' => $datareq['amenities'] ?? $olddata->amenities,
                'videos' => !empty($Videos) ? json_encode($Videos) : $olddata->videos,
                'status' => $datareq['status'],
                'publishrequest' => $datareq['publishrequest'],
            ]);
            $updatedProperty = PropertyListing::where('id', $id)->first(); // Fetch updated record
            return response()->json(['data' => $updatedProperty, 'message' => 'Listing Updated successfully!']);
        } catch (Exception $e) {
            return response()->json(['error' => true, 'message' => $e->getMessage()]);
        }
    }

    public function deletefile(Request $request)
    {
        // Log::info("Delete request received:", $request->all());

        try {
            $request->validate([
                'property_id' => 'required|exists:property_listings,id',
                'file_type' => 'required|in:thumbnail,gallery,video,document,masterplan',
                'file_path' => 'required|string',
            ]);

            $property = PropertyListing::find($request->property_id);
            if (!$property) {
                return response()->json(['error' => true, 'message' => 'Property not found.']);
            }

            // Normalize file path (remove escaped slashes)
            $filePath = str_replace('\/', '/', $request->file_path);
            $absoluteFilePath = public_path($filePath);

            // Log::info("Attempting to delete file at: " . $absoluteFilePath);

            // Check if the file exists and delete it
            if (file_exists($absoluteFilePath)) {
                unlink($absoluteFilePath);
                // Log::info("File deleted successfully: " . $absoluteFilePath);
            } else {
                Log::warning('File not found: ' . $absoluteFilePath);
            }

            // Handle different file types and update the database
            switch ($request->file_type) {
                case 'thumbnail':
                    $property->thumbnail = null;
                    break;
                case 'gallery':
                    $galleryImages = json_decode($property->gallery, true) ?? [];
                    $galleryImages = array_values(
                        array_filter($galleryImages, function ($img) use ($filePath) {
                            return trim(str_replace('\/', '/', $img)) !== trim($filePath);
                        }),
                    );
                    $property->gallery = json_encode($galleryImages);
                    break;
                case 'video':
                    $videos = json_decode($property->videos, true) ?? [];
                    $videos = array_values(
                        array_filter($videos, function ($vid) use ($filePath) {
                            return trim(str_replace('\/', '/', $vid)) !== trim($filePath);
                        }),
                    );
                    $property->videos = json_encode($videos);
                    // Log::info("Updated videos list: " . json_encode($videos));
                    break;
                case 'document':
                    $documents = json_decode($property->documents, true) ?? [];
                    $documents = array_values(
                        array_filter($documents, function ($doc) use ($filePath) {
                            return trim(str_replace('\/', '/', $doc)) !== trim($filePath);
                        }),
                    );
                    $property->documents = json_encode($documents);
                    // Log::info("Updated documents list: " . json_encode($documents));
                    break;
                case 'masterplan':
                    $masterPlans = json_decode($property->masterplandoc, true) ?? [];
                    $masterPlans = array_values(
                        array_filter($masterPlans, function ($doc) use ($filePath) {
                            return trim(str_replace('\/', '/', $doc)) !== trim($filePath);
                        }),
                    );
                    $property->masterplandoc = json_encode($masterPlans);
                    // Log::info("Updated master plan list: " . json_encode($masterPlans));
                    break;
            }

            $property->save();

            return response()->json(['message' => 'File deleted successfully']);
        } catch (Exception $e) {
            Log::error('File delete error: ' . $e->getMessage());
            return response()->json(['error' => true, 'message' => 'Failed to delete file.']);
        }
    }

    // **WEB LOGIN - Redirects to Google for Authentication**
    public function googleLogin()
    {
        return Socialite::driver('google')->redirect();
    }

    // **WEB AUTHENTICATION - Handles Callback from Google**
    public function GoogleAuth()
    {
        try {
            $googleUser = Socialite::driver('google')->user();

            $user = RegisterUser::where('google_id', $googleUser->id)->orWhere('email', $googleUser->email)->first();

            if ($user) {
                Auth::guard('customer')->login($user);
                $user->update(['verification_status' => 1]);
                return redirect()->route('website.homepage')->with('success', 'You are logged in successfully');
            }

            return redirect()->route('website.userlogin')->with('error', 'This user is not registered');
        } catch (Exception $exception) {
            return redirect()
                ->route('website.userlogin')
                ->with('error', 'Something went wrong: ' . $exception->getMessage());
        }
    }

    // **API LOGIN/REGISTER - Handles Google Sign-In for Mobile Apps / Frontend**
    public function appGoogleAuth(Request $request)
    {
        try {
            $request->validate(['token' => 'required|string']);

            // Verify token with Google API
            $googleUser = Http::get('https://www.googleapis.com/oauth2/v3/userinfo', [
                'access_token' => $request->token,
            ])->json();

            if (!isset($googleUser['sub'])) {
                return response()->json(['success' => false, 'message' => 'Invalid Google token'], 401);
            }

            // Check if user exists
            $user = RegisterUser::where('google_id', $googleUser['sub'])->orWhere('email', $googleUser['email'])->first();

            if (!$user) {
                // Register new user
                $user = RegisterUser::create([
                    'username' => $googleUser['name'],
                    'email' => $googleUser['email'],
                    'google_id' => $googleUser['sub'],
                    'user_type' => $request->user_type ?? 'default',
                    'verification_status' => 1,
                    'profile' => $googleUser['picture'] ?? 'public/adminAssets/images/defaultuser.png',
                    'password' => Hash::make(uniqid()),
                ]);
            }

            // Log in the user
            Auth::guard('customer')->login($user);

            // Generate API token for mobile/web
            $apiToken = $user->createToken('authToken')->plainTextToken;

            return response()->json(
                [
                    'success' => true,
                    'message' => 'User authenticated successfully',
                    'token' => $apiToken,
                    'data' => $user,
                ],
                200,
            );
        } catch (Exception $exception) {
            return response()->json(['success' => false, 'message' => 'Something went wrong', 'error' => $exception->getMessage()], 500);
        }
    }

    // **API REGISTER - Handles Google Registration**
    public function googleRegister(Request $request)
    {
        try {
            $client = new Google_Client(['client_id' => config('services.google.client_id')]);
            $payload = $client->verifyIdToken($request->id_token);

            if (!$payload) {
                return response()->json(['error' => 'Invalid ID Token'], 400);
            }

            $googleId = $payload['sub'];
            $email = $payload['email'];
            $name = $payload['username'];
            $avatar = $payload['picture'] ?? 'public/adminAssets/images/defaultuser.png';
            $userType = $request->user_type ?? 'default';

            $user = RegisterUser::where('email', $email)->first();

            if ($user) {
                return response()->json(['message' => 'User already exists'], 409);
            }

            $newUser = RegisterUser::create([
                'username' => $name,
                'user_type' => $userType,
                'email' => $email,
                'google_id' => $googleId,
                'verification_status' => 1,
                'profile' => $avatar,
                'password' => Hash::make(uniqid()),
            ]);

            return response()->json(['message' => 'Registered Successfully', 'user' => $newUser], 201);
        } catch (Exception $e) {
            return response()->json(['error' => 'Something went wrong', 'message' => $e->getMessage()], 500);
        }
    }

    public function brokerlist()
    {
        $brokerlistdata = RegisterUser::select('username', 'profile', 'id', 'mobilenumber', 'city')->where('user_type', 'broker')->where('verification_status', '1')->get();

        return response()->json(['success' => true, 'data' => $brokerlistdata]);
    }
    public function brokerprofile(Request $rq)
    {
        $brokerdata = RegisterUser::select('username', 'profile', 'email', 'company_name', 'mobilenumber')->where('id', $rq->id)->where('user_type', 'broker')->where('verification_status', '1')->get();

        $allproperties = PropertyListing::select('property_name', 'id', 'price', 'city', 'thumbnail', 'category')->where('roleid', $rq->id)->where('status', 'published')->orderBy('created_at', 'DESC')->get();

        return response()->json([
            'success' => true,
            'brokerdata' => $brokerdata,
            'allproperties' => $allproperties,
        ]);
    }

    public function fetchenquiries(Request $rq)
    {
        try {
            $user = $this->validateToken($rq);
            if (is_a($user, '\Illuminate\Http\JsonResponse')) {
                return $user;
            }

            // Fetch my enquiries with propertyfor
            $myenquiries = Lead::where('userid', $user->id)->where('form_type', 'broker')->join('property_listings', 'leads.propertyid', '=', 'property_listings.id')->select('leads.*', 'property_listings.propertyfor')->get();

            // Log::info('My Enquiries', $myenquiries->toArray());

            // Broker enquiries
            $brokerenquiries = Lead::where('agentid', $user->id)->where('form_type', 'broker')->join('property_listings', 'leads.propertyid', '=', 'property_listings.id')->select('leads.*', 'property_listings.propertyfor')->get();

            // Loan enquiries
            $loanenquiries = Lead::where('form_type', 'bankagent')->get();

            return response()->json([
                'success' => true,
                'myenquiries' => $myenquiries,
                'brokerenquiries' => $brokerenquiries,
                'loanenquiries' => $loanenquiries,
            ]);
        } catch (Exception $e) {
            Log::error('Error in fetchenquiries: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function fetchenquiry(Request $request, $id)
    {
        // Log::info('fetchenquiry called', ['id' => $id, 'headers' => $request->headers->all()]);
        try {
            $user = $this->validateToken($request);
            if (is_a($user, '\Illuminate\Http\JsonResponse')) {
                // Log::info('Token validation failed for lead ID: ' . $id);
                return $user;
            }

            $lead = Lead::where('id', $id)->first();
            if (!$lead) {
                Log::warning('No lead found for ID: ' . $id . ', user ID: ' . $user->id);
                return response()->json(
                    [
                        'success' => false,
                        'message' => 'Lead not found or unauthorized',
                    ],
                    404,
                );
            }

            return response()->json([
                'success' => true,
                'lead' => $lead,
            ]);
        } catch (Exception $e) {
            Log::error('Error in fetchenquiry for lead ID: ' . $id, ['error' => $e->getMessage()]);
            return response()->json(
                [
                    'success' => false,
                    'message' => 'Internal server error: ' . $e->getMessage(),
                ],
                500,
            );
        }
    }

    public function bankagentlist()
    {
        $bankagentlistdata = RegisterUser::select('username', 'profile', 'id')->where('user_type', 'bankagent')->where('verification_status', '1')->get();
        return response()->json(['success' => true, 'data' => $bankagentlistdata]);
    }
    public function bankagentprofile(Request $rq)
    {
        $agentdata = RegisterUser::select('username', 'profile', 'email', 'company_name')->where('id', $rq->id)->where('user_type', 'bankagent')->where('verification_status', '1')->get();

        return response()->json([
            'success' => true,
            'agentdata' => $agentdata,
        ]);
    }

    public function sendloanenquiry(Request $rq)
    {
        try {
            // Validate request data
            $rq->validate([
                'customername' => 'required|string',
                'mobilenumber' => 'required|string|regex:/^[0-9]{10}$/',
                'email' => 'required|email',
                'city' => 'required|string',
                'state' => 'nullable|string',
                'form_type' => 'required|string',
                'loan_amount' => 'required|numeric|min:0',
                'documents.*' => 'required|mimes:pdf,jpeg,jpg',
            ]);

            // Handle multiple documents
            $documents = [];
            if ($rq->hasFile('documents')) {
                $files = $rq->file('documents');
                foreach ($files as $file) {
                    $documentname = md5(rand(1000, 10000));
                    $extension = strtolower($file->getClientOriginalExtension());
                    $documentfullname = $documentname . '.' . $extension;
                    $uploadedPath = public_path('assets/images/EnquiryDocs');
                    $file->move($uploadedPath, $documentfullname);
                    $documents[] = 'assets/images/EnquiryDocs/' . $documentfullname;
                }
            }

            // Create Lead
            $data = Lead::create([
                'userid' => $rq->userid,
                'name' => $rq->customername,
                'mobilenumber' => $rq->mobilenumber,
                'email' => $rq->email,
                'city' => $rq->city,
                'state' => $rq->state,
                'documents' => !empty($documents) ? json_encode($documents) : null,
                'form_type' => $rq->form_type,
                'loan_amount' => $rq->loan_amount,
            ]);

            return response()->json(
                [
                    'success' => true,
                    'data' => $data,
                ],
                200,
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(
                [
                    'success' => false,
                    'message' => 'Validation failed',
                    'errors' => $e->errors(),
                ],
                422,
            );
        } catch (\Exception $e) {
            \Log::error('Loan enquiry error: ' . $e->getMessage());
            return response()->json(
                [
                    'success' => false,
                    'message' => 'Server error occurred',
                ],
                500,
            );
        }
    }

    public function UpdateBidStatus(Request $request)
    {
        try {
            $property = PropertyListing::findOrFail($request->propertyid);
            $property->update([
                // 'bidstatus' => $request->bidliveStatus,
                'bidliverequest' => $request->bidliverequest,
                'bidenddate' => $request->bidEnddate ?? $property->bidenddate,
            ]);

            // if ($request->bidliveStatus === 'on') {
            //     $recipients = RegisterUser::whereIn('user_type', ['user', 'broker'])->get();
            //     foreach ($recipients as $user) {
            //         $user->notify(new BidLiveNotification($property));
            //     }
            //     Log::info('Notifications are sent!');
            // }

            return response()->json(['success' => true, 'message' => 'Bid request sent. Awaiting admin approval.'], 200);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'error' => 'Failed to update bid status: ' . $e->getMessage()], 500);
        }
    }

    public function UpdateBidAmount(Request $request)
    {
        try {
            $leads = Lead::findOrFail($request->leadid);
            $existingBids = json_decode($leads->propertybid, true);

            foreach ($existingBids as &$bid) {
                if ($bid['date'] == $request->biddate) {
                    $bid['bidamount'] = $request->bidamount;
                    $bid['date'] = now()->toDateString();
                }
            }
            $leads->update([
                'propertybid' => json_encode($existingBids),
            ]);

            return response()->json(['success' => true, 'message' => 'Bid Updated'], 200);
        } catch (Exception $e) {
            return response()->json(['success' => false, 'error' => 'Failed to update bid status: ' . $e->getMessage()], 500);
        }
    }

    public function deleteListing(Request $request)
    {
        try {
            // Validate the request
            $request->validate([
                'property_id' => 'required|integer|exists:property_listings,id',
                'roleid' => 'required|integer|exists:register_users,id',
            ]);

            // Find the property
            $property = PropertyListing::find($request->property_id);
            if (!$property) {
                return response()->json(
                    [
                        'error' => true,
                        'message' => 'Property not found',
                    ],
                    404,
                );
            }
            // Log::info('Property ' . $property->id . ' requested for deletion by user ID ' . $request->roleid);

            // Check if the user is the owner or an admin
            if ($property->roleid != $request->roleid) {
                $user = RegisterUser::find($request->roleid);
                if (!$user || $user->user_type != 'Admin') {
                    // Log::info('Unauthorized: User ID ' . $request->roleid . ' is not owner or admin, user_type: ' . ($user ? $user->user_type : 'not found') . ', property owner roleid: ' . $property->roleid);
                    return response()->json(
                        [
                            'error' => true,
                            'message' => 'Unauthorized to delete this property',
                        ],
                        403,
                    );
                }
            }

            // Delete associated files
            $basePath = public_path('adminAssets/images/Listings/');
            if ($property->thumbnail) {
                $thumbnailPath = $basePath . ltrim($property->thumbnail, '/');
                File::exists($thumbnailPath) ? File::delete($thumbnailPath) : Log::warning('Thumbnail not found: ' . $thumbnailPath);
            }

            if ($property->gallery) {
                $galleryImages = is_string($property->gallery) ? json_decode($property->gallery, true) : $property->gallery;
                if (is_array($galleryImages)) {
                    foreach ($galleryImages as $image) {
                        $imagePath = $basePath . ltrim($image, '/');
                        File::exists($imagePath) ? File::delete($imagePath) : Log::warning('Gallery image not found: ' . $imagePath);
                    }
                }
            }

            if ($property->videos) {
                $videos = is_string($property->videos) ? json_decode($property->videos, true) : $property->videos;
                if (is_array($videos)) {
                    foreach ($videos as $video) {
                        $videoPath = $basePath . ltrim($video, '/');
                        File::exists($videoPath) ? File::delete($videoPath) : Log::warning('Video not found: ' . $videoPath);
                    }
                }
            }

            if ($property->documents) {
                $documents = is_string($property->documents) ? json_decode($property->documents, true) : $property->documents;
                if (is_array($documents)) {
                    foreach ($documents as $document) {
                        $documentPath = $basePath . ltrim($document, '/');
                        File::exists($documentPath) ? File::delete($documentPath) : Log::warning('Document not found: ' . $documentPath);
                    }
                }
            }

            if ($property->masterplandoc) {
                $masterPlanDocs = is_array($property->masterplandoc) ? $property->masterplandoc : [$property->masterplandoc];
                foreach ($masterPlanDocs as $doc) {
                    $docPath = $basePath . ltrim($doc, '/');
                    File::exists($docPath) ? File::delete($docPath) : Log::warning('Master plan document not found: ' . $docPath);
                }
            }

            // Delete the property
            $property->delete();
            // Log::info('Property deleted: ID ' . $property->id . ' by user ID ' . $request->roleid);

            return response()->json(
                [
                    'error' => false,
                    'message' => 'Property deleted successfully',
                ],
                200,
            );
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json(
                [
                    'error' => true,
                    'message' => 'Validation failed',
                    'errors' => $e->errors(),
                ],
                422,
            );
        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Database error deleting property ID ' . ($property->id ?? 'unknown') . ': ' . $e->getMessage());
            return response()->json(
                [
                    'error' => true,
                    'message' => 'Cannot delete property due to related records',
                ],
                409,
            );
        } catch (\Exception $e) {
            Log::error('Error deleting property ID ' . ($property->id ?? 'unknown') . ': ' . $e->getMessage());
            return response()->json(
                [
                    'error' => true,
                    'message' => 'Failed to delete property',
                ],
                500,
            );
        }
    }

    public function checkWishlistStatus(Request $request, $userId, $propertyId)
    {
        $user = $this->validateToken($request);

        if (is_a($user, '\Illuminate\Http\JsonResponse')) {
            return $user;
        }

        if ($user->id != $userId) {
            return response()->json(
                [
                    'success' => false,
                    'message' => 'Unauthorized access to wishlist',
                ],
                403,
            );
        }

        try {
            $isWishlisted = Wishlist::where('user_id', $userId)->where('property_id', $propertyId)->exists();

            return response()->json(
                [
                    'success' => true,
                    'isWishlisted' => $isWishlisted,
                ],
                200,
            );
        } catch (\Exception $e) {
            return response()->json(
                [
                    'success' => false,
                    'message' => 'Server error: ' . $e->getMessage(),
                ],
                500,
            );
        }
    }

    public function addToWishlist(Request $request)
    {
        $user = $this->validateToken($request);

        if (is_a($user, '\Illuminate\Http\JsonResponse')) {
            return $user;
        }

        $validator = Validator::make($request->all(), [
            'userId' => 'required|exists:register_users,id',
            'propertyId' => 'required|exists:property_listings,id',
        ]);

        if ($validator->fails()) {
            return response()->json(
                [
                    'success' => false,
                    'message' => $validator->errors()->first(),
                ],
                422,
            );
        }

        $userId = $request->input('userId');
        $propertyId = $request->input('propertyId');

        if ($user->id != $userId) {
            return response()->json(
                [
                    'success' => false,
                    'message' => 'Unauthorized access to wishlist',
                ],
                403,
            );
        }

        try {
            $existing = Wishlist::where('property_id', $propertyId)->where('user_id', $userId)->first();

            if ($existing) {
                // Remove if exists
                $existing->delete();
                return response()->json([
                    'success' => true,
                    'added' => false,
                    'message' => 'Removed from wishlist',
                ]);
            } else {
                // Add if not exists
                Wishlist::create([
                    'property_id' => $propertyId,
                    'user_id' => $userId,
                    'status' => '1',
                ]);
                return response()->json([
                    'success' => true,
                    'added' => true,
                    'message' => 'Added to wishlist',
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Wishlist toggle error: ', [
                'error' => $e->getMessage(),
                'userId' => $userId,
                'propertyId' => $propertyId,
            ]);
            return response()->json(
                [
                    'success' => false,
                    'message' => 'Server error occurred',
                ],
                500,
            );
        }
    }

    public function getEncryptedId(Request $request, $id)
    {
        $user = $this->validateToken($request);

        if (is_a($user, '\Illuminate\Http\JsonResponse')) {
            return $user;
        }

        return response()->json([
            'encrypted_id' => encrypt($id),
        ]);
    }

    public function mywishlists(Request $request, $id)
    {
        $user = $this->validateToken($request);

        if (is_a($user, '\Illuminate\Http\JsonResponse')) {
            return $user;
        }

        $mywishlists = Wishlist::join('property_listings', 'wishlists.property_id', '=', 'property_listings.id')
            ->select('wishlists.id as wishlist_id', 'wishlists.*', 'property_listings.*')
            ->where('wishlists.user_id', $id) // Changed $id->id to $id
            ->orderByDesc('wishlists.created_at')
            ->get();

        //dd($mywishlists);
        return response()->json([
            'mywishlistdata' => $mywishlists,
        ]);
    }

    public function trackvisit(Request $request)
    {
        try {
            // Validate token
            $user = $this->validateToken($request);
            if (is_a($user, '\Illuminate\Http\JsonResponse')) {
                return $user;
            }

            $propertyId = $request->input('property_id');

            $userId = $user->id;
            $ipAddress = $request->ip();

            $details = $request->input('details');

            if (is_array($details)) {
                $details = json_encode($details);
            } elseif (is_null($details)) {
                $details = json_encode([
                    'user_agent' => $request->header('User-Agent'),
                    'referer' => $request->header('referer'),
                ]);
            }

            $visitorToken = $request->input('visitor_token');

            // Ensure uniqueness
            $visit = PropertyVisit::updateOrCreate(
                [
                    'property_id' => $propertyId,
                    'user_id' => $userId,
                ],
                [
                    'ip_address' => $ipAddress,
                    'visitor_token' => $visitorToken,
                    'details' => $details,
                ],
            );

            return response()->json([
                'success' => true,
                'message' => 'Visit tracked successfully',
                'data' => $visit,
            ]);
        } catch (\Exception $ex) {
            \Log::error('Error tracking visit', [
                'error' => $ex->getMessage(),
                'trace' => $ex->getTraceAsString(),
            ]);
            return response()->json(
                [
                    'success' => false,
                    'message' => 'Server error: ' . $ex->getMessage(),
                ],
                500,
            );
        }
    }

    public function getVisitorCount(Request $request, $propertyId)
    {
        try {
            $user = $this->validateToken($request);
            if (is_a($user, '\Illuminate\Http\JsonResponse')) {
                return $user;
            }

            // ✅ Unique count: logged-in by user_id, guests by visitor_token
            $count = PropertyVisit::where('property_id', $propertyId)->selectRaw('COUNT(DISTINCT COALESCE(CAST(user_id AS CHAR), visitor_token)) as unique_count')->value('unique_count');

            return response()->json([
                'success' => true,
                'count' => $count,
                'message' => 'Visitor count retrieved successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Error retrieving visitor count', [
                'error' => $e->getMessage(),
                'property_id' => $propertyId,
            ]);

            return response()->json(
                [
                    'success' => false,
                    'message' => 'Error retrieving visitor count: ' . $e->getMessage(),
                ],
                500,
            );
        }
    }

    public function updatefollowup(Request $request)
    {
        // Log::info('updatefollowup called', [
        //     'payload' => $request->all(),
        //     'headers' => $request->headers->all(),
        // ]);
        try {
            $user = $this->validateToken($request);
            if (is_a($user, '\Illuminate\Http\JsonResponse')) {
                Log::warning('Token validation failed', ['response' => $user]);
                return $user;
            }

            $recordId = $request->input('recordid');
            if (!$recordId || !is_numeric($recordId)) {
                Log::warning('Invalid or missing recordid', ['recordid' => $recordId]);
                return response()->json(
                    [
                        'error' => 'Invalid or missing record ID.',
                        'received' => $recordId,
                    ],
                    422,
                );
            }

            $lead = Lead::find($recordId);
            if (!$lead) {
                Log::warning('Lead not found', ['recordid' => $recordId]);
                return response()->json(
                    [
                        'error' => 'Lead not found for ID: ' . $recordId,
                    ],
                    404,
                );
            }

            $existingFollowups = $lead->followupdetails ? json_decode($lead->followupdetails, true) : [];
            $followupdate = $request->input('followupdate');
            $followupdescription = $request->input('followupdescription');
            $updated = false;

            if ($followupdate && $followupdescription) {
                try {
                    new \DateTime($followupdate);
                } catch (Exception $e) {
                    Log::warning('Invalid follow-up date format', ['followupdate' => $followupdate]);
                    return response()->json(
                        [
                            'error' => 'Invalid follow-up date format: ' . $followupdate,
                        ],
                        422,
                    );
                }
                if (strlen($followupdescription) > 1000) {
                    Log::warning('Follow-up description too long', ['length' => strlen($followupdescription)]);
                    return response()->json(
                        [
                            'error' => 'Follow-up description exceeds 1000 characters.',
                        ],
                        422,
                    );
                }
                $existingFollowups[] = [
                    'date' => $followupdate,
                    'description' => $followupdescription,
                ];
                $lead->followupdetails = json_encode($existingFollowups);
                $updated = true;
            } elseif ($followupdate || $followupdescription) {
                Log::warning('Incomplete note data', [
                    'followupdate' => $followupdate,
                    'followupdescription' => $followupdescription,
                ]);
                return response()->json(
                    [
                        'error' => 'Both followupdate and followupdescription must be provided together.',
                        'received' => ['followupdate' => $followupdate, 'followupdescription' => $followupdescription],
                    ],
                    422,
                );
            }

            $followupstatus = $request->input('followupstatus');
            if ($followupstatus) {
                $validStatuses = ['New', 'Qualified', 'Not Responded', 'Won', 'Final'];
                if (!in_array($followupstatus, $validStatuses)) {
                    Log::warning('Invalid status value', ['followupstatus' => $followupstatus]);
                    return response()->json(
                        [
                            'error' => 'Invalid status value: ' . $followupstatus,
                            'validStatuses' => $validStatuses,
                        ],
                        422,
                    );
                }
                $lead->status = $followupstatus;
                $updated = true;
            }

            if (!$updated) {
                Log::warning('No changes provided', ['payload' => $request->all()]);
                return response()->json(
                    [
                        'error' => 'No changes provided to update.',
                        'received' => $request->all(),
                    ],
                    422,
                );
            }

            $lead->save();
            // Log::info('Lead updated successfully', ['recordid' => $recordId]);

            return response()->json(
                [
                    'success' => 'Follow-up added and/or status updated successfully.',
                    'lead' => $lead,
                ],
                200,
            );
        } catch (Exception $e) {
            Log::error('updatefollowup error', [
                'error' => $e->getMessage(),
                'payload' => $request->all(),
            ]);
            return response()->json(
                [
                    'error' => 'An error occurred: ' . $e->getMessage(),
                ],
                500,
            );
        }
    }

    public function upcomingproject(Request $request)
    {
        $user = $this->validateToken($request);
        if (is_a($user, '\Illuminate\Http\JsonResponse')) {
            return $user;
        }
        //Upcoming Projects
        $projects = UpcomingProject::where('status', '=', 'Active')->get();

        return response()->json(
            [
                'success' => 'success',
                'projects' => $projects,
            ],
            200,
        );
    }
    public function fetchproject(Request $request, $id)
    {
        $user = $this->validateToken($request);
        if (is_a($user, '\Illuminate\Http\JsonResponse')) {
            return $user;
        }
        //Upcoming Projects
        $projectData = UpcomingProject::where('id', $id)->where('status', '=', 'Active')->first();

        return response()->json(
            [
                'success' => 'success',
                'projectData' => $projectData,
            ],
            200,
        );
    }
    
}
