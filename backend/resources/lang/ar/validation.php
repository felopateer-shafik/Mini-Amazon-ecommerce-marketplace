<?php

return [
    'required' => 'حقل :attribute مطلوب.',
    'email' => 'يجب أن يكون :attribute عنوان بريد إلكتروني صحيحاً.',
    'password_complexity' => 'يجب أن تحتوي كلمة المرور على حرف كبير وحرف صغير ورقم واحد على الأقل.',
    'min' => [
        'string' => 'يجب أن يكون :attribute على الأقل :min أحرف.',
        'array' => 'يجب أن تحتوي :attribute على الأقل :min عنصر.',
    ],
    'max' => [
        'string' => 'يجب ألا يتجاوز :attribute :max أحرف.',
        'array' => 'قد لا يكون لدى :attribute أكثر من :max عنصر.',
    ],
    'between' => [
        'numeric' => 'يجب أن يكون :attribute بين :min و :max.',
    ],
    'unique' => 'تم أخذ :attribute بالفعل.',
    'exists' => ':attribute المحدد غير صحيح.',
];
