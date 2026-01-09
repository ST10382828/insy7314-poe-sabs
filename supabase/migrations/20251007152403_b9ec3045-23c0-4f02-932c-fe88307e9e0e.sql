-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('customer', 'employee');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'verified', 'submitted_to_swift');

-- Create enum for currency types
CREATE TYPE public.currency_type AS ENUM ('USD', 'EUR', 'GBP', 'ZAR', 'JPY', 'CNY', 'AUD');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create customers table for storing customer profile information
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  id_number TEXT NOT NULL UNIQUE,
  account_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS policies for customers table
CREATE POLICY "Customers can view their own profile"
  ON public.customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Customers can update their own profile"
  ON public.customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Employees can view all customer profiles"
  ON public.customers FOR SELECT
  USING (public.has_role(auth.uid(), 'employee'));

-- Create employees table for pre-registered staff
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  employee_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- RLS policies for employees table
CREATE POLICY "Employees can view their own profile"
  ON public.employees FOR SELECT
  USING (auth.uid() = user_id);

-- Create payments table for storing international payment transactions
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
  currency currency_type NOT NULL,
  provider TEXT NOT NULL DEFAULT 'SWIFT',
  payee_account_number TEXT NOT NULL,
  payee_name TEXT NOT NULL,
  swift_code TEXT NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES public.employees(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for payments table
CREATE POLICY "Customers can view their own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = payments.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can insert their own payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = payments.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can view all payments"
  ON public.payments FOR SELECT
  USING (public.has_role(auth.uid(), 'employee'));

CREATE POLICY "Employees can update payment status"
  ON public.payments FOR UPDATE
  USING (public.has_role(auth.uid(), 'employee'));

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new customer registration
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert customer profile
  INSERT INTO public.customers (user_id, full_name, id_number, account_number)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'id_number',
    NEW.raw_user_meta_data->>'account_number'
  );
  
  -- Assign customer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic customer profile creation
CREATE TRIGGER on_auth_customer_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.raw_user_meta_data->>'user_type' = 'customer')
  EXECUTE FUNCTION public.handle_new_customer();

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_customers_user_id ON public.customers(user_id);
CREATE INDEX idx_customers_account_number ON public.customers(account_number);
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_payments_customer_id ON public.payments(customer_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);